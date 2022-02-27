export async function pushCmd(mm, { limitToLang, leverage, dryRun, quota }) {
    const status = [];
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const langStatus = { targetLang };
        const jobBody = await mm.prepareTranslationJob({ targetLang, leverage });
        if (Object.keys(jobBody.tus).length > 0) {
            if (dryRun) {
                langStatus.tus = jobBody.tus;
            } else {
                const manifest = await mm.jobStore.createJobManifest();
                langStatus.jobId = manifest.jobId;
                const jobRequest = {
                    ...jobBody,
                    ...manifest,
                };
                const translationProvider = mm.getTranslationProvider(jobRequest);
                if (translationProvider) {
                    jobRequest.translationProvider = translationProvider.constructor.name;
                    let jobResponse;
                    if (jobBody.tus.length <= quota) {
                        jobResponse = await translationProvider.requestTranslations(jobRequest);
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
                    throw 'No translationProvider configured';
                }
            }
            status.push(langStatus);
        }
    }
    return status;
}
