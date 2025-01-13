export async function jobsCmd(mm, { limitToLang }) {
    const unfinishedJobs = {};
    const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.tmm.getAvailableLangPairs())
        .filter(pair => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const pendingJobs = (await mm.tmm.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => e[1].status !== 'done');
        unfinishedJobs[targetLang] = [];
        for (const [ jobGuid, handle ] of pendingJobs) {
            unfinishedJobs[targetLang].push(await (handle.status === 'pending' ? mm.tmm.getJob(jobGuid) : mm.tmm.getJobRequest(jobGuid)));
        }
    }
    return unfinishedJobs;
}
