import { L10nContext } from '@l10nmonster/core';

export async function pullCmd(mm, { limitToLang, partial }) {
    const stats = { numPendingJobs: 0, translatedStrings: 0, doneJobs: 0, newPendingJobs: 0 };
    const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.tmm.getAvailableLangPairs())
        .filter(pair => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const pendingJobs = (await mm.tmm.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => e[1] === 'pending')
            .map(e => e[0]);
        stats.numPendingJobs += pendingJobs.length;
        for (const jobGuid of pendingJobs) {
            const pendingJob = await mm.tmm.getJob(jobGuid);
            if (pendingJob.status === 'pending') {
                L10nContext.logger.info(`Pulling job ${jobGuid}...`);
                const translationProvider = mm.getTranslationProvider(pendingJob);
                const jobResponse = await translationProvider.translator.fetchTranslations(pendingJob);
                if (jobResponse?.status === 'done') {
                    await mm.tmm.processJob(jobResponse, pendingJob);
                    stats.translatedStrings += jobResponse.tus.length;
                    stats.doneJobs++;
                } else if (jobResponse?.status === 'pending') {
                    L10nContext.logger.info(`Got ${jobResponse.tus.length} translations for job ${pendingJob.jobGuid} but there are still ${jobResponse.inflight.length} translations in flight`);
                    if (partial) {
                        const { inflight, ...doneResponse } = jobResponse;
                        doneResponse.status = 'done';
                        await mm.tmm.processJob(doneResponse, pendingJob);
                        stats.translatedStrings += jobResponse.tus.length;

                        const newRequest = { ...pendingJob };
                        const newManifest = await mm.tmm.createJobManifest();
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
                        await mm.tmm.processJob(newResponse, newRequest);
                        stats.newPendingJobs++;
                    }
                }
            }
        }
    }
    return stats;
}
