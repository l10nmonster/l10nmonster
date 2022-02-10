export async function pushCmd(mm, { limitToLang, leverage }) {
    const status = [];
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const langStatus = { targetLang };
        const jobBody = await mm.prepareTranslationJob({ targetLang, leverage });
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
                const jobResponse = await translationProvider.requestTranslations(jobRequest);
                await mm.processJob(jobResponse, jobRequest);
                langStatus.status = jobResponse.status;
                langStatus.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
                leverage && (langStatus.internalRepetitions = jobRequest.leverage.internalRepetitions);
                status.push(langStatus);
            } else {
                throw 'No translationProvider configured';
            }
        }
    }
    return status;
}
