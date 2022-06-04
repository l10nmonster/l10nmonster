export async function pushCmd(mm, { limitToLang, bugfixFilter, bugfixDriver, bugfixJobGuid, translationProviderName, leverage, dryRun }) {
    if (bugfixFilter && !mm.bugfixFilters[bugfixFilter]) {
        throw `Couldn't find ${bugfixFilter} bugfix filter`;
    }
    let guidList;
    if (bugfixJobGuid) {
        const req = await mm.jobStore.getJobRequest(bugfixJobGuid);
        if (!req) {
            throw `jobGuid ${bugfixJobGuid} not found`;
        }
        guidList = req.tus.map(tu => tu.guid);
    }
    const status = [];
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const blockedJobs = (await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang))
            .filter(e => e[1] === 'req');
        if (blockedJobs.length === 0) {
            const jobBody = await (bugfixDriver ? mm.prepareBugfixJob({ targetLang, filter: bugfixFilter, tmBased: bugfixDriver === 'tm', guidList }) : mm.prepareTranslationJob({ targetLang, leverage }));
            const langStatus = { sourceLang: jobBody.sourceLang, targetLang };
            if (Object.keys(jobBody.tus).length > 0) {
                if (dryRun) {
                    langStatus.tus = jobBody.tus;
                } else {
                    jobBody.translationProvider = translationProviderName;
                    const translationProvider = mm.getTranslationProvider(jobBody);
                    if (translationProvider) {
                        const minimumJobSize = translationProvider.minimumJobSize ?? 0;
                        if (jobBody.tus.length >= minimumJobSize) {
                            const manifest = await mm.jobStore.createJobManifest();
                            langStatus.jobGuid = manifest.jobGuid;
                            const jobRequest = {
                                ...jobBody,
                                ...manifest,
                            };
                            const quota = translationProvider.quota ?? Number.MAX_VALUE;
                            let jobResponse;
                            if (jobBody.tus.length <= quota) {
                                jobResponse = await (bugfixDriver ? translationProvider.translator.refreshTranslations(jobRequest) : translationProvider.translator.requestTranslations(jobRequest));
                                jobResponse.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
                            } else {
                                jobRequest.status = 'blocked';
                            }
                            await mm.processJob(jobResponse, jobRequest);
                            langStatus.status = jobResponse?.status ?? jobRequest.status;
                            langStatus.num = jobResponse?.num ?? jobRequest.tus.length;
                        } else {
                            langStatus.minimumJobSize = minimumJobSize;
                            langStatus.num = jobBody.tus.length;
                        }
                    } else {
                        throw `No ${translationProviderName} translationProvider configured`;
                    }
                }
                status.push(langStatus);
            }
        } else {
            throw `Can't push a job for language ${targetLang} if there are blocked/failed jobs outstanding`;
        }
    }
    return status;
}
