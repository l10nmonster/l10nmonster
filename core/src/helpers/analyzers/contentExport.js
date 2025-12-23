/**
 * @typedef {import('../../interfaces.js').Analyzer} Analyzer
 * @typedef {import('../../interfaces.js').AnalyzerTU} AnalyzerTU
 * @typedef {import('../../interfaces.js').NormalizedString} NormalizedString
 */

/**
 * Converts a normalized string to a CSV-compatible string.
 * @param {NormalizedString} nstr - The normalized string.
 * @returns {string} CSV-compatible string.
 */
function makeCSVCompatibleString(nstr) {
    return nstr.map(e => (typeof e === 'string' ? e : `{${e?.t}}`)).join('').replaceAll(',', '').replaceAll('\n', ' ');
}

/**
 * Analyzer that finds specific patterns in translations.
 * @implements {Analyzer}
 */
export class FindInTarget {
    static helpParams = '[regex]';
    static help = 'find a_bx_bold kind of text in translations or the desired regex';

    /**
     * @param {string} [regex] - Optional regex pattern to match.
     */
    constructor(regex) {

        /** @type {Array<[string, string, string]>} */
        this.foundTus = [];
        this.regex = (regex && new RegExp(regex)) ?? /(?<ph>(?<phIdx>[a-y]|z\d+)_(?<t>x|bx|ex)_(?<phName>[0-9A-Za-z_]*))/;
    }

    /**
     * Process a translation unit during analysis.
     * @param {{ targetLang: string, tu: AnalyzerTU }} context - TU context.
     */
    processTU({ targetLang, tu }) {
        if (tu.ntgt) {
            for (const part of tu.ntgt) {
                if (typeof part === 'string' && part.match(this.regex)) {
                    this.foundTus.push([
                        targetLang,
                        tu.guid,
                        makeCSVCompatibleString(tu.ntgt),
                    ]);
                    break;
                }
            }
        }
    }

    getAnalysis() {
        return {
            head: ['lang', 'guid', 'target'],
            groupBy: ['lang'],
            body: this.foundTus,
        };
    }
}

/**
 * Analyzer that exports side-by-side translation grids.
 * @implements {Analyzer}
 */
export class ExportTranslationGrid {
    static help = 'export side by side translations';

    constructor() {

        /** @type {Record<string, boolean>} */
        this.langs = {};

        /** @type {Record<string, { source: string, [lang: string]: string }>} */
        this.grid = {};
    }

    /**
     * Process a translation unit during analysis.
     * @param {{ targetLang: string, tu: AnalyzerTU }} context - TU context.
     */
    processTU({ targetLang, tu }) {
        this.langs[targetLang] = true;
        this.grid[tu.guid] ??= { source: makeCSVCompatibleString(tu.nsrc) };
        this.grid[tu.guid][targetLang] = makeCSVCompatibleString(tu.ntgt);
    }

    getAggregateAnalysis() {
        return {
            head: [ 'guid', 'source', ...Object.keys(this.langs)],
            groupBy: ['lang'],
            body: Object.entries(this.grid).map(([guid, tx]) => [
                guid,
                tx.source,
                ...Object.keys(this.langs).map(lang => tx[lang] || '')
            ]),
        };
    }
}
