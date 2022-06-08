// eslint-disable-next-line complexity
export async function pushCmd(mm, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions }) {
    if (tuFilter && !mm.tuFilters[tuFilter]) {
        throw `Couldn't find ${tuFilter} tu filter`;
    }
    let guidList;
    if (driver.jobGuid) {
        const req = await mm.jobStore.getJobRequest(driver.jobGuid);
        if (!req) {
            throw `jobGuid ${driver.jobGuid} not found`;
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
            const jobBody = await (driver.untranslated ? mm.prepareTranslationJob({ targetLang, leverage }) : mm.prepareFilterBasedJob({ targetLang, tmBased: driver.tm, guidList }));
            tuFilter && (jobBody.tus = jobBody.tus.filter(tu => mm.tuFilters[tuFilter](tu)));
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
                            instructions && (jobRequest.instructions = instructions);
                            const quota = translationProvider.quota ?? Number.MAX_VALUE;
                            let jobResponse;
                            if (jobBody.tus.length <= quota) {
                                jobResponse = await (refresh ? translationProvider.translator.refreshTranslations(jobRequest) : translationProvider.translator.requestTranslations(jobRequest));
                            } else {
                                jobRequest.status = 'blocked';
                            }
                            await mm.processJob(jobResponse, jobRequest);
                            langStatus.status = jobResponse?.status ?? jobRequest.status;
                            langStatus.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
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
