export async function jobsCmd(mm, { limitToLang }) {
    const unfinishedJobs = {};
    const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.jobStore.getAvailableLangPairs())
        .filter(pair => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const pendingJobs = (await mm.jobStore.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => e[1].status !== 'done');
        unfinishedJobs[targetLang] = [];
        for (const [ jobGuid, handle ] of pendingJobs) {
            unfinishedJobs[targetLang].push(await (handle.status === 'pending' ? mm.jobStore.getJob(jobGuid) : mm.jobStore.getJobRequest(jobGuid)));
        }
    }
    return unfinishedJobs;
}
