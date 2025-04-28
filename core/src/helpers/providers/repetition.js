import { L10nContext, logVerbose, styleString } from '@l10nmonster/core';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * This provider implements reuse of exact matches against the TM and other segments in the same request (aka internal leverage).
 * It supports a penalty factor based on matching the same id (aka qualified) or not (aka unqualified) and whether the notes match.
 * The assigned quality of the reused string is equal to the original one minus the corresponding penalty.
 */
export class Repetition extends BaseTranslationProvider {
    /**
     * Initializes a new instance of the Repetition class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} [options.qualifiedPenalty] - Penalty for qualified matches.
     * @param {number} [options.unqualifiedPenalty] - Penalty for unqualified matches.
     * @param {number} [options.notesMismatchPenalty] - Penalty for notes mismatch.
     */
    constructor({ qualifiedPenalty, unqualifiedPenalty, notesMismatchPenalty, ...options }) {
        // @ts-ignore
        if (options.quality) {
            throw new Error('Fixed quality is not supported for Repetition');
        }
        super(options);
        this.qualifiedPenalty = qualifiedPenalty ?? 0;
        this.unqualifiedPenalty = unqualifiedPenalty ?? 0;
        this.notesMismatchPenalty = notesMismatchPenalty ?? 0;
    }

    #calculateAdjustedQuality(tu, candidate) {
        const idPenalty = tu.sid === candidate.sid ? this.qualifiedPenalty : this.unqualifiedPenalty;
        const notesPenalty =  tu.notes?.desc && tu.notes.desc !== candidate.notes?.desc ? this.notesMismatchPenalty : 0;
        return Math.max(0, candidate.q - idPenalty - notesPenalty);
    }

    #pickBestCandidate(tu, tuCandidates) {
        let bestCandidate = { q: 0, ts: 0 };
        for (const candidate of tuCandidates) {
            const adjustedQuality = this.#calculateAdjustedQuality(tu, candidate);
            const isSameQualityButNewer = adjustedQuality === bestCandidate.q && candidate.ts > bestCandidate.ts;
            if (adjustedQuality > bestCandidate.q || isSameQualityButNewer) {
                bestCandidate = { ...candidate, q: adjustedQuality };
            }
        }
        return bestCandidate;
    }

    async getAcceptedTus(job) {
        const matchedTus = [];
        const tm = this.mm.tmm.getTM(job.sourceLang, job.targetLang);
        for (const sourceTu of job.tus) {
            const tuCandidates = tm.getExactMatches(sourceTu.nsrc);
            if (tuCandidates.length > 0) {
                const bestCandidate = this.#pickBestCandidate(sourceTu, tuCandidates);
                if (sourceTu.minQ <= bestCandidate.q) {
                    matchedTus.push({
                        ...sourceTu,
                        ntgt: bestCandidate.ntgt,
                        q: bestCandidate.q,
                        ts: L10nContext.regression ? 1 : new Date().getTime(),
                        parentGuid: bestCandidate.guid,
                    });
                }
            }
        }
        return matchedTus;
    }
    async info() {
        const info = await super.info();
        info.description.push(styleString`Quality penalties: qualified: ${this.qualifiedPenalty ?? 0}, unqualified: ${this.unqualifiedPenalty ?? 0}, notes mismatch: ${this.notesMismatchPenalty ?? 0}`);
        return info;
    }
}
