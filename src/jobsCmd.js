export async function jobsCmd(mm, { limitToLang }) {
    const unfinishedJobs = {};
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const jobGuids = await mm.jobStore.getWIPJobs(mm.sourceLang, targetLang);
        unfinishedJobs[targetLang] = [];
        for (const jobGuid of jobGuids) {
            unfinishedJobs[targetLang].push(await mm.jobStore.getJob(jobGuid));
        }
    }
    return unfinishedJobs;
}
