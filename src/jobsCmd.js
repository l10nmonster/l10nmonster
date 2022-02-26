const unfinishedStatuses = [ 'blocked', 'pending' ];
export async function jobsCmd(mm, { limitToLang }) {
    const unfinishedJobs = {};
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const status of unfinishedStatuses) {
        const jobManifests = await mm.jobStore.getJobManifests(status);
        for (const targetLang of targetLangs) {
            unfinishedJobs[targetLang] ??= {};
            unfinishedJobs[targetLang][status] = jobManifests.filter(job => job.targetLang === targetLang);
        }
    }
    return unfinishedJobs;
}
