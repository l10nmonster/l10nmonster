import { utils } from '@l10nmonster/core';

// eslint-disable-next-line complexity
export async function pushCmd(mm, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions }) {
    let tuFilterFunction;
    if (tuFilter) {
        tuFilter = utils.fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
        tuFilterFunction = mm.tuFilters[tuFilter];
        if (!tuFilterFunction) {
            throw `Couldn't find ${tuFilter} tu filter`;
        }
    }
    let guidList;
    if (driver.jobGuid) {
        const req = await mm.tmm.getJob(driver.jobGuid);
        if (!req) {
            throw `jobGuid ${driver.jobGuid} not found`;
        }
        guidList = req.tus.map(tu => tu.guid);
    }
    const status = [];
    const targetLangs = await mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const blockedJobs = (await mm.tmm.getJobStatusByLangPair(mm.sourceLang, targetLang))
            .filter(e => e[1] === 'req');
        if (blockedJobs.length === 0) {
            const jobBody = await (driver.untranslated ? mm.prepareTranslationJob({ targetLang, leverage }) : mm.prepareFilterBasedJob({ targetLang, tmBased: driver.tm, guidList }));
            tuFilterFunction && (jobBody.tus = jobBody.tus.filter(tu => tuFilterFunction(tu)));
            const langStatus = { sourceLang: jobBody.sourceLang, targetLang };
            if (Object.keys(jobBody.tus).length > 0) {
                if (dryRun) {
                    langStatus.tus = jobBody.tus;
                } else {
                    jobBody.translationProvider = translationProviderName;
                    const translationProvider = mm.getTranslationProvider(jobBody);
                    langStatus.provider = jobBody.translationProvider; // this may have its case fixed by getTranslationProvider()
                    if (translationProvider) {
                        const minimumJobSize = translationProvider.minimumJobSize ?? 0;
                        if (jobBody.tus.length >= minimumJobSize || refresh) {
                            const manifest = await mm.tmm.createJobManifest();
                            langStatus.jobGuid = manifest.jobGuid;
                            const jobRequest = {
                                ...jobBody,
                                ...manifest,
                            };
                            instructions && (jobRequest.instructions = instructions);
                            const quota = translationProvider.quota ?? Number.MAX_VALUE;
                            let jobResponse;
                            if (jobBody.tus.length <= quota || refresh) {
                                jobResponse = await (refresh ? translationProvider.translator.refreshTranslations(jobRequest) : translationProvider.translator.requestTranslations(jobRequest));
                            } else {
                                jobRequest.status = 'blocked';
                            }
                            await mm.dispatcher.processJob(jobResponse, jobRequest);
                            langStatus.status = jobResponse?.status ?? jobRequest.status;
                            langStatus.num = jobResponse?.tus?.length ?? jobResponse?.inflight?.length ?? jobRequest?.tus?.length ?? 0;
                        } else {
                            langStatus.minimumJobSize = minimumJobSize;
                            langStatus.num = jobBody?.tus?.length ?? 0;
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
