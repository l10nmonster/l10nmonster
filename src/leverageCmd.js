// this is similar to grandfather using translations of identical strings in different files (qualified)
// or different segments (unqualified)
export async function leverageCmd(mm, limitToLang) {
    if (mm.qualifiedPenalty === undefined || mm.unqualifiedPenalty === undefined) {
        return { error: 'You need to define qualifiedPenalty and unqualifiedPenalty properties in the config to use leverage!' };
    }
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    const status = [];
    for (const targetLang of targetLangs) {
        const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
        const jobRequest = await mm.prepareTranslationJob({ targetLang });
        const sources = [];
        const translations = [];
        for (const tu of jobRequest.tus) {
            const tuCandidates = tm.getAllEntriesBySrc(tu.src);
            if (tuCandidates.length > 0) {
                let bestCandidate = { q: 0, ts: 0 };
                for (const candidate of tuCandidates) {
                    if (tu.sid === candidate.sid || tu.sid !== bestCandidate.sid) {
                        if (candidate.q > bestCandidate.q || (candidate.q === bestCandidate.q && candidate.ts > bestCandidate.ts)) {
                            bestCandidate = candidate;
                        }
                    }
                }
                const leveragedTU = {
                    ...bestCandidate,
                    rid: tu.rid,
                    sid: tu.sid,
                    guid: mm.generateFullyQualifiedGuid(tu.rid, tu.sid, tu.src),
                    q: Math.max(0, bestCandidate.q - (tu.sid === bestCandidate.sid ? mm.qualifiedPenalty : mm.unqualifiedPenalty), 0),
                };
                sources.push(tu);
                translations.push(leveragedTU);
            }
        }
        mm.verbose && console.log(`Leveraging ${targetLang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} can be leveraged`);
        if (translations.length > 0) {
            // eslint-disable-next-line no-unused-vars
            const { tus, ...jobResponse } = jobRequest;
            const manifest = await mm.jobStore.createJobManifest();
            jobRequest.tus = sources;
            translations.forEach(tu => tu.jobId = manifest.jobId);
            jobResponse.tus = translations;
            jobResponse.status = 'done';
            jobResponse.translationProvider = 'Repetition';
            await mm.processJob({ ...jobResponse, ...manifest, status: 'done' }, { ...jobRequest, ...manifest });
            status.push({
                num: translations.length,
                targetLang,
            });
        }
    }
    return status;
}
