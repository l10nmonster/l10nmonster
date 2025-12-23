/**
 * @typedef {import('../../interfaces.js').Analyzer} Analyzer
 * @typedef {import('../../interfaces.js').AnalyzerTU} AnalyzerTU
 * @typedef {import('../../interfaces.js').NormalizedString} NormalizedString
 */

/**
 * Checks if placeholder nesting is valid in a normalized string.
 * @param {NormalizedString} normalizedString - The normalized string to check.
 * @returns {boolean} True if nesting is valid.
 */
function nestingIsValid(normalizedString) {
    if (!Array.isArray(normalizedString)) {
        return true;
    }
    let nestingLevel = 0;
    for (const part of normalizedString) {
        if (typeof part !== 'string' && part.t === 'bx') {
            nestingLevel++;
        } else if (typeof part !== 'string' && part.t === 'ex') {
            nestingLevel--;
            if (nestingLevel < 0) {
                break;
            }
        }
    }
    return nestingLevel === 0;
}

/**
 * Converts a normalized string to a CSV-compatible string.
 * @param {NormalizedString} nstr - The normalized string.
 * @returns {string} CSV-compatible string.
 */
function makeCSVCompatibleString(nstr) {
    return nstr.map(e => (typeof e === 'string' ? e : `{${e.t}}`)).join('').replaceAll(',', '').replaceAll('\n', ' ');
}

/**
 * Analyzer that finds mismatched open/close placeholders in translations.
 * @implements {Analyzer}
 */
export default class MismatchedTags {
    static help = 'find mismatched open/close placeholders in translations';

    constructor() {

        /** @type {Array<[string, string, string, string]>} */
        this.foundTus = [];
    }

    /**
     * Process a translation unit during analysis.
     * @param {{ targetLang: string, tu: AnalyzerTU }} context - TU context.
     */
    processTU({ targetLang, tu }) {
        if (nestingIsValid(tu.nsrc) && !nestingIsValid(tu.ntgt)) {
            this.foundTus.push([
                targetLang,
                tu.guid,
                makeCSVCompatibleString(tu.nsrc),
                makeCSVCompatibleString(tu.ntgt),
            ]);
        }
    }

    getAnalysis() {
        return {
            head: ['lang', 'guid', 'source', 'target'],
            groupBy: ['lang'],
            body: this.foundTus,
        };
    }
}
