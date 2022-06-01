export async function jobsCmd(mm, { limitToLang }) {
    const unfinishedJobs = {};
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const pendingJobs = await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang)
            .filter(e => e[1] !== 'done')
            .map(e => e[0]);
        unfinishedJobs[targetLang] = [];
        for (const [ jobGuid, status ] of pendingJobs) {
            unfinishedJobs[targetLang].push(await (status === 'req' ? mm.jobStore.getJobRequest(jobGuid) : mm.jobStore.getJob(jobGuid)));
        }
    }
    return unfinishedJobs;
}
