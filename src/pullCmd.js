export async function pullCmd(mm, { limitToLang }) {
    const stats = { numPendingJobs: 0, translatedStrings: 0 };
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const pendingJobs = (await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang))
            .filter(e => e[1] === 'pending')
            .map(e => e[0]);
        stats.numPendingJobs += pendingJobs.length;
        for (const jobGuid of pendingJobs) {
            const jobManifest = await mm.jobStore.getJob(jobGuid);
            if (jobManifest.status === 'pending') {
                mm.verbose && console.log(`Pulling job ${jobGuid}...`);
                const translationProvider = mm.getTranslationProvider(jobManifest);
                const jobResponse = await translationProvider.translator.fetchTranslations(jobManifest);
                if (jobResponse?.status === 'done') {
                    await mm.processJob(jobResponse);
                    stats.translatedStrings += jobResponse.tus.length;
                }
            }
        }
    }
    return stats;
}
