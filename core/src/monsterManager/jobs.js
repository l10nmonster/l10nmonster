export async function jobsCmd(mm, { limitToLang }) {
    const unfinishedJobs = {};
    const desiredTargetLangs = new Set(await mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.tmm.getAvailableLangPairs())
        .filter(pair => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const pendingJobs = (await mm.tmm.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => e[1] !== 'done')
            .map(e => e[0]);
        unfinishedJobs[targetLang] = [];
        for (const jobGuid of pendingJobs) {
            unfinishedJobs[targetLang].push(await mm.tmm.getJob(jobGuid));
        }
    }
    return unfinishedJobs;
}
