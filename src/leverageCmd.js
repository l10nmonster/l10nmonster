import { sourceAndTargetAreCompatible } from './normalizers/util.js';

// this is similar to grandfather using translations of identical strings in different files (qualified)
// or different segments (unqualified)
// eslint-disable-next-line complexity
export async function leverageCmd(mm, limitToLang) {
    if (mm.qualifiedPenalty === undefined || mm.unqualifiedPenalty === undefined) {
        return { error: 'You need to define qualifiedPenalty and unqualifiedPenalty properties in the config to use leverage!' };
    }
    const targetLangs = await mm.source.getTargetLangs(limitToLang);
    const status = [];
    for (const targetLang of targetLangs) {
        const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
        const jobRequest = await mm.prepareTranslationJob({ targetLang });
        jobRequest.translationProvider = 'Repetition';
        const sources = [];
        const translations = [];
        for (const tu of jobRequest.tus) {
            const tuCandidates = tm.getAllEntriesBySrc(tu.nsrc ?? tu.src);
            if (tuCandidates.length > 0) {
                let bestCandidate = { q: 0, ts: 0 };
                let foundCandidate = false;
                for (const candidate of tuCandidates) {
                    if (tu.sid === candidate.sid || tu.sid !== bestCandidate.sid) { // prefer a qualified match
                        const isCompatible = sourceAndTargetAreCompatible(tu?.nsrc ?? tu?.src, candidate?.ntgt ?? candidate?.tgt);
                        const isSameQualityButNewer = candidate.q === bestCandidate.q && candidate.ts > bestCandidate.ts;
                        const isBetterCandidate = candidate.q > bestCandidate.q || isSameQualityButNewer;
                        if (isCompatible && isBetterCandidate) {
                            bestCandidate = candidate;
                            foundCandidate = true;
                        }
                    }
                }
                if (foundCandidate) {
                    const leveragedTU = {
                        guid: tu.guid,
                        q: Math.max(0, bestCandidate.q - (tu.sid === bestCandidate.sid ? mm.qualifiedPenalty : mm.unqualifiedPenalty), 0),
                    };
                    !bestCandidate.nsrc && (leveragedTU.src = bestCandidate.src);
                    bestCandidate.nsrc && (leveragedTU.nsrc = bestCandidate.nsrc);
                    bestCandidate.tgt && (leveragedTU.tgt = bestCandidate.tgt);
                    bestCandidate.ntgt && (leveragedTU.ntgt = bestCandidate.ntgt);
                    bestCandidate.ts && (leveragedTU.ts = bestCandidate.ts);
                    sources.push(tu);
                    translations.push(leveragedTU);
                }
            }
        }
        mm.ctx.logger.info(`Leveraging ${targetLang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} can be leveraged`);
        if (translations.length > 0) {
            // eslint-disable-next-line no-unused-vars
            const { tus, ...jobResponse } = jobRequest;
            const manifest = await mm.jobStore.createJobManifest();
            jobRequest.tus = sources;
            translations.forEach(tu => tu.jobGuid = manifest.jobGuid);
            jobResponse.tus = translations;
            jobResponse.status = 'done';
            await mm.processJob({ ...jobResponse, ...manifest, status: 'done' }, { ...jobRequest, ...manifest });
            status.push({
                num: translations.length,
                targetLang,
            });
        }
    }
    return status;
}
