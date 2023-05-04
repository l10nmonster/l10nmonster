export async function pullCmd(mm, { limitToLang, partial }) {
    const stats = { numPendingJobs: 0, translatedStrings: 0, doneJobs: 0, newPendingJobs: 0 };
    const targetLangs = await mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const pendingJobs = (await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang))
            .filter(e => e[1].status === 'pending')
            .map(e => e[0]);
        stats.numPendingJobs += pendingJobs.length;
        for (const jobGuid of pendingJobs) {
            const jobRequest = await mm.jobStore.getJobRequest(jobGuid);
            const pendingJob = await mm.jobStore.getJob(jobGuid);
            if (pendingJob.status === 'pending') {
                mm.ctx.logger.info(`Pulling job ${jobGuid}...`);
                const translationProvider = mm.getTranslationProvider(pendingJob);
                const jobResponse = await translationProvider.translator.fetchTranslations(pendingJob, jobRequest);
                if (jobResponse?.status === 'done') {
                    await mm.processJob(jobResponse);
                    stats.translatedStrings += jobResponse.tus.length;
                    stats.doneJobs++;
                } else if (jobResponse?.status === 'pending') {
                    mm.ctx.logger.info(`Got ${jobResponse.tus.length} translations from TOS for job ${jobRequest.jobGuid} but there are still ${jobResponse.inflight.length} translations in flight`);
                    if (partial) {
                        const { inflight, ...doneResponse } = jobResponse;
                        doneResponse.status = 'done';
                        await mm.processJob(doneResponse);
                        stats.translatedStrings += jobResponse.tus.length;

                        const newRequest = await mm.jobStore.getJobRequest(jobResponse.jobGuid);
                        const newManifest = await mm.jobStore.createJobManifest();
                        newRequest.jobGuid = newManifest.jobGuid;
                        newRequest.tus = newRequest.tus.filter(tu => inflight.includes(tu.guid));
                        // eslint-disable-next-line no-unused-vars
                        const { tus, ...newResponse } = doneResponse;
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
