export async function pushCmd(mm) {
    const status = [];
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs();
    for (const targetLang of targetLangs) {
        const jobBody = await mm.prepareTranslationJob(targetLang);
        if (Object.keys(jobBody.tus).length > 0) {
            const manifest = await mm.jobStore.createJobManifest();
            const jobRequest = {
                ...jobBody,
                ...manifest,
            };
            const translationProvider = mm.getTranslationProvider(jobRequest);
            if (translationProvider) {
                jobRequest.translationProvider = translationProvider.constructor.name;
                // this may return a "jobResponse" if syncronous or a "jobManifest" if asynchronous
                const job = await translationProvider.requestTranslations(jobRequest);
                await mm.processJob(job, jobRequest);
                status.push({
                    num: job.tus?.length ?? job.inflight?.length ?? 0,
                    lang: job.targetLang,
                    status: job.status
                });
            } else {
                throw 'No translationProvider configured';
            }
        }
    }
    return status;
}
