
export async function pullCmd(mm, { limitToLang, partial }) {
    const stats = { numPendingJobs: 0, translatedStrings: 0, doneJobs: 0, newPendingJobs: 0 };
    const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.jobStore.getAvailableLangPairs())
        .filter(pair => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const pendingJobs = (await mm.jobStore.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => e[1].status === 'pending')
            .map(e => e[0]);
        stats.numPendingJobs += pendingJobs.length;
        for (const jobGuid of pendingJobs) {
            const jobRequest = await mm.jobStore.getJobRequest(jobGuid);
            const pendingJob = await mm.jobStore.getJob(jobGuid);
            if (pendingJob.status === 'pending') {
                l10nmonster.logger.info(`Pulling job ${jobGuid}...`);
                const translationProvider = mm.getTranslationProvider(pendingJob);
                const jobResponse = await translationProvider.translator.fetchTranslations(pendingJob, jobRequest);
                if (jobResponse?.status === 'done') {
                    await mm.processJob(jobResponse, jobRequest);
                    stats.translatedStrings += jobResponse.tus.length;
                    stats.doneJobs++;
                } else if (jobResponse?.status === 'pending') {
                    l10nmonster.logger.info(`Got ${jobResponse.tus.length} translations for job ${jobRequest.jobGuid} but there are still ${jobResponse.inflight.length} translations in flight`);
                    if (partial) {
                        const { inflight, ...doneResponse } = jobResponse;
                        doneResponse.status = 'done';
                        await mm.processJob(doneResponse, jobRequest);
                        stats.translatedStrings += jobResponse.tus.length;

                        const newRequest = await mm.jobStore.getJobRequest(jobResponse.jobGuid); // TODO: can we just use jobRequest?
                        const newManifest = await mm.jobStore.createJobManifest();
                        const originalJobGuid = jobResponse.originalJobGuid ?? jobResponse.jobGuid;
                        newRequest.originalJobGuid = originalJobGuid;
                        newRequest.jobGuid = newManifest.jobGuid;
                        newRequest.tus = newRequest.tus.filter(tu => inflight.includes(tu.guid));
                        // eslint-disable-next-line no-unused-vars
                        const { tus, ...newResponse } = doneResponse;
                        newResponse.originalJobGuid = originalJobGuid;
                        newResponse.jobGuid = newManifest.jobGuid;
                        newResponse.inflight = inflight;
                        newResponse.status = 'pending';
                        await mm.processJob(newResponse, newRequest);
                        stats.newPendingJobs++;
                    }
                }
            }
        }
    }
    return stats;
}
