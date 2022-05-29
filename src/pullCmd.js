export async function pullCmd(mm, { limitToLang }) {
    const stats = { numPendingJobs: 0, translatedStrings: 0 };
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const pendingJobs = await mm.jobStore.getWIPJobs(mm.sourceLang, targetLang);
        stats.numPendingJobs += pendingJobs.length;
        for (const jobGuid of pendingJobs) {
            const jobManifest = await mm.jobStore.getJob(jobGuid);
            if (jobManifest.status === 'pending') {
                mm.verbose && console.log(`Pulling job ${jobGuid}...`);
                const translationProvider = mm.getTranslationProvider(jobManifest);
                const newTranslations = await translationProvider.translator.fetchTranslations(jobManifest);
                if (newTranslations) {
                    await mm.processJob(newTranslations);
                    stats.translatedStrings += newTranslations.tus.length;
                }
            }
        }
    }
    return stats;
}
