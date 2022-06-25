import {
    sourceAndTargetAreCompatible, normalizedStringsAreEqual,
} from '../normalizers/util.js';

// this provider reuses translations of identical strings with same id in different files (qualified)
// or identical strings with different id (unqualified)
// the assigned quality of the reused string is equal to the original one minus corresponding penalty
export class Repetition {
    constructor({ qualifiedPenalty, unqualifiedPenalty }) {
        if ((qualifiedPenalty && unqualifiedPenalty) === undefined) {
            throw 'You must specify qualifiedPenalty and unqualifiedPenalty properties for Repetition';
        }
        this.qualifiedPenalty = qualifiedPenalty;
        this.unqualifiedPenalty = unqualifiedPenalty;
    }

    // eslint-disable-next-line complexity
    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = [];
        const tm = await this.ctx.mm.tmm.getTM(this.ctx.mm.sourceLang, jobRequest.targetLang);
        for (const tu of tus) {
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
                    const q = Math.max(0, bestCandidate.q - (tu.sid === bestCandidate.sid ? this.qualifiedPenalty : this.unqualifiedPenalty), 0);
                    const leveragedTU = {
                        guid: tu.guid,
                        q,
                    };
                    !bestCandidate.nsrc && (leveragedTU.src = bestCandidate.src);
                    bestCandidate.nsrc && (leveragedTU.nsrc = bestCandidate.nsrc);
                    !bestCandidate.ntgt && (leveragedTU.tgt = bestCandidate.tgt);
                    bestCandidate.ntgt && (leveragedTU.ntgt = bestCandidate.ntgt);
                    const existingTU = tm.getEntryByGuid(tu.guid);
                    if (existingTU && normalizedStringsAreEqual(existingTU.ntgt ?? existingTU.ntgt, leveragedTU.ntgt ?? leveragedTU.ntgt)) {
                        this.ctx.logger.verbose(`Did not leverage ${bestCandidate.guid} for ${tu.guid} because TM already has an identical entry (maybe of quality < minimum quality)`);
                    } else {
                        leveragedTU.ts = this.ctx.regression ? (existingTU?.ts ?? 0) + 1 : new Date().getTime(); // if there's an entry already we want to make sure we're more recent
                        jobResponse.tus.push(leveragedTU);
                        this.ctx.logger.verbose(`Leveraged ${bestCandidate.guid} for ${tu.guid}`);
                    }
                }
            }
        }
        jobResponse.status = 'done';
        this.ctx.logger.info(`Leveraging ${jobRequest.targetLang}... found ${tus.length} missing translations, of which ${jobResponse.tus.length} can be leveraged`);
        return jobResponse;
    }

    // sync api only
    async fetchTranslations() {
        throw 'Repetition is a synchronous-only provider';
    }

    async refreshTranslations(jobRequest) {
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt ?? reqTuMap[tu.guid].tgt, tu.ntgt ?? tu.tgt)),
        };
    }
}
