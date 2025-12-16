import { getRegressionMode, styleString } from '../../l10nContext.js';
import { utils } from '../index.js';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * This provider implements reuse of exact matches against the TM and other segments in the same request (aka internal leverage).
 * It supports a penalty factor based on matching the same id (aka qualified) or not (aka unqualified) and whether the notes match.
 * The assigned quality of the reused string is equal to the original one minus the corresponding penalty.
 *
 * When holdInternalLeverage is enabled, this provider also holds back duplicate TUs within the same job,
 * using a smart algorithm that minimizes the number of TUs sent for translation while ensuring all
 * held-back TUs can leverage translations based on penalty and minQ constraints.
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
     * @param {number} [options.groupPenalty] - Penalty for group mismatch.
     * @param {boolean} [options.holdInternalLeverage] - Whether to hold back internal repetitions.
     * @param {number} [options.expectedQuality] - Expected quality of translations (required when holdInternalLeverage is true).
     */
    constructor({ qualifiedPenalty, unqualifiedPenalty, notesMismatchPenalty, groupPenalty, holdInternalLeverage, expectedQuality, ...options }) {
        // @ts-ignore
        if (options.quality) {
            throw new Error('Fixed quality is not supported for Repetition');
        }
        if (holdInternalLeverage && expectedQuality === undefined) {
            throw new Error('expectedQuality is required when holdInternalLeverage is true');
        }
        super(options);
        this.qualifiedPenalty = qualifiedPenalty ?? 0;
        this.unqualifiedPenalty = unqualifiedPenalty ?? 0;
        this.notesMismatchPenalty = notesMismatchPenalty ?? 0;
        this.groupPenalty = groupPenalty ?? 0;
        this.holdInternalLeverage = holdInternalLeverage ?? false;
        this.expectedQuality = expectedQuality;
    }

    #calculatePenalty(from, to) {
        const idPenalty = from.sid === to.sid ? this.qualifiedPenalty : this.unqualifiedPenalty;
        const notesPenalty = from.notes?.desc !== to.notes?.desc ? this.notesMismatchPenalty : 0;
        const groupPenalty = from.group !== to.group ? this.groupPenalty : 0;
        return idPenalty + notesPenalty + groupPenalty;
    }

    #canCover(translator, candidate) {
        const penalty = this.#calculatePenalty(translator, candidate);
        return this.expectedQuality - penalty >= candidate.minQ;
    }

    #computeInternalLeverageHoldouts(tus) {
        // Group TUs by normalized source (gstr)
        const gstrMap = {};
        for (const tu of tus) {
            // Skip pluralized TUs as they require special handling
            if (tu.pluralForm) {
                continue;
            }
            const gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc);
            gstrMap[gstr] ??= [];
            gstrMap[gstr].push(tu);
        }

        const holdouts = [];
        const toTranslate = new Set();

        // Process each group of TUs with identical source
        for (const [, group] of Object.entries(gstrMap)) {
            if (group.length <= 1) {
                // No repetitions, nothing to hold back
                continue;
            }

            // Build coverage: for each TU, which other TUs can it cover?
            const coverage = new Map();
            for (const tu of group) {
                const canCover = [];
                for (const other of group) {
                    if (this.#canCover(tu, other)) {
                        canCover.push(other);
                    }
                }
                coverage.set(tu, canCover);
            }

            // Greedy algorithm to find minimum dominating set
            const uncovered = new Set(group);
            const translators = new Set();
            const parentAssignment = new Map();

            while (uncovered.size > 0) {
                // Find TU that covers the most uncovered TUs
                let bestTranslator = null;
                let bestCoveredCount = 0;
                let bestCovered = [];

                for (const tu of uncovered) {
                    const canCoverList = coverage.get(tu);
                    const coveredUncovered = canCoverList.filter(other => uncovered.has(other));
                    if (coveredUncovered.length > bestCoveredCount) {
                        bestTranslator = tu;
                        bestCoveredCount = coveredUncovered.length;
                        bestCovered = coveredUncovered;
                    }
                }

                if (!bestTranslator) {
                    // Should not happen if algorithm is correct, but safety fallback
                    // Pick any uncovered TU as translator
                    bestTranslator = uncovered.values().next().value;
                    bestCovered = [bestTranslator];
                }

                translators.add(bestTranslator);
                for (const covered of bestCovered) {
                    uncovered.delete(covered);
                    if (covered !== bestTranslator) {
                        parentAssignment.set(covered, bestTranslator);
                    }
                }
            }

            // Mark TUs to translate
            for (const translator of translators) {
                toTranslate.add(translator);
            }

            // Create holdout entries for non-translators
            for (const [child, parent] of parentAssignment) {
                const penalty = this.#calculatePenalty(parent, child);
                holdouts.push({
                    ...child,
                    parentGuid: parent.guid,
                    inflight: true,
                    ts: 0,
                    q: this.expectedQuality - penalty,
                });
            }
        }

        return { toTranslate, holdouts };
    }

    #calculateAdjustedQuality(tu, candidate) {
        const idPenalty = tu.sid === candidate.sid ? this.qualifiedPenalty : this.unqualifiedPenalty;
        const notesPenalty = tu.notes?.desc && tu.notes.desc !== candidate.notes?.desc ? this.notesMismatchPenalty : 0;
        const groupPenalty = tu.group !== candidate.group ? this.groupPenalty : 0;
        return Math.max(0, candidate.q - idPenalty - notesPenalty - groupPenalty);
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
        let tusToProcess = job.tus;

        // Handle internal leverage holdouts if enabled
        if (this.holdInternalLeverage) {
            const { toTranslate, holdouts } = this.#computeInternalLeverageHoldouts(job.tus);
            matchedTus.push(...holdouts);
            // Only process TUs that need translation (not held back)
            tusToProcess = job.tus.filter(tu => !holdouts.some(h => h.guid === tu.guid));
        }

        // Process TM lookups for remaining TUs
        const tm = this.mm.tmm.getTM(job.sourceLang, job.targetLang);
        for (const sourceTu of tusToProcess) {
            // Skip pluralized TUs as they require special handling
            if (sourceTu.pluralForm) {
                continue;
            }
            const tuCandidates = await tm.getExactMatches(sourceTu.nsrc);
            if (tuCandidates.length > 0) {
                const bestCandidate = this.#pickBestCandidate(sourceTu, tuCandidates);
                if (sourceTu.minQ <= bestCandidate.q) {
                    matchedTus.push({
                        ...sourceTu,
                        ntgt: bestCandidate.ntgt,
                        q: bestCandidate.q,
                        ts: getRegressionMode() ? 1 : new Date().getTime(),
                        parentGuid: bestCandidate.guid,
                    });
                }
            }
        }
        return matchedTus;
    }

    async getTranslatedTus(job) {
        return job.tus.filter(tu => !tu.inflight);
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Quality penalties: qualified: ${this.qualifiedPenalty ?? 0}, unqualified: ${this.unqualifiedPenalty ?? 0}, notes mismatch: ${this.notesMismatchPenalty ?? 0}, group: ${this.groupPenalty ?? 0}`);
        if (this.holdInternalLeverage) {
            info.description.push(styleString`Internal leverage holdout: enabled (expectedQuality: ${this.expectedQuality})`);
        }
        return info;
    }
}
