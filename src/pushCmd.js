export async function pushCmd(mm, { limitToLang, leverage, dryRun, translationProviderName }) {
    const status = [];
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const jobBody = await mm.prepareTranslationJob({ targetLang, leverage });
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
                        langStatus.jobId = manifest.jobId;
                        const jobRequest = {
                            ...jobBody,
                            ...manifest,
                        };
                        const quota = translationProvider.quota ?? Number.MAX_VALUE;
                        let jobResponse;
                        if (jobBody.tus.length <= quota) {
                            jobResponse = await translationProvider.translator.requestTranslations(jobRequest);
                        } else {
                            jobResponse = {
                                ...jobRequest,
                                status: 'blocked',
                                inflight: Object.values(jobRequest.tus).map(tu => tu.guid),
                            };
                        }
                        jobResponse.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
                        await mm.processJob(jobResponse, jobRequest);
                        langStatus.status = jobResponse.status;
                        langStatus.num = jobResponse.num;
                    } else {
                        langStatus.minimumJobSize = minimumJobSize;
                        langStatus.num = jobBody.tus.length;
                    }
                } else {
                    throw 'No translationProvider configured';
                }
            }
            status.push(langStatus);
        }
    }
    return status;
}
