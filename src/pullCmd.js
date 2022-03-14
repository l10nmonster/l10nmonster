export async function pullCmd(mm) {
    const stats = { numPendingJobs: 0, translatedStrings: 0 };
    const pendingJobs = await mm.jobStore.getJobManifests('pending');
    stats.numPendingJobs = pendingJobs.length;
    for (const jobManifest of pendingJobs) {
        mm.verbose && console.log(`Pulling job ${jobManifest.jobId}...`);
        const translationProvider = mm.getTranslationProvider(jobManifest);
        const newTranslations = await translationProvider.translator.fetchTranslations(jobManifest);
        if (newTranslations) {
            await mm.processJob(newTranslations);
            stats.translatedStrings += newTranslations.tus.length;
        }
    }
    return stats;
}
