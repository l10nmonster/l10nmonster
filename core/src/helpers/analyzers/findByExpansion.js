import { readFileSync } from 'fs';

/**
 * @typedef {import('../../interfaces.js').Analyzer} Analyzer
 * @typedef {import('../../interfaces.js').AnalyzerTU} AnalyzerTU
 * @typedef {import('../../interfaces.js').NormalizedString} NormalizedString
 */

/**
 * Converts a normalized string to a CSV-compatible string (text only).
 * @param {NormalizedString} nstr - The normalized string.
 * @returns {string} CSV-compatible string.
 */
const makeCSVCompatibleString = nstr => nstr.map(e => (typeof e === 'string' ? e : ''))
    .join('')
    .replaceAll(',', '')
    .replaceAll('\n', ' ');

/**
 * Analyzer that finds translations with abnormal expansion rates.
 * @implements {Analyzer}
 */
export default class FindByExpansion {
    static helpParams = '<average|csvFile> <minDelta|sigmas>';
    static help = 'find in TM all translations that grew more than minDelta/sigma multiples of the average';

    /**
     * @param {string | number} average - Average growth rate or path to CSV file.
     * @param {string | number} minDelta - Minimum delta or sigma multiplier.
     */
    constructor(average, minDelta) {

        /** @type {Array<[string, string, string, string, string]>} */
        this.foundTus = [];
        this.average = Number(average);
        this.minDelta = Number(minDelta);

        /** @type {Record<string, [string, string]> | undefined} */
        this.stats = undefined;
        if (this.minDelta > 0) {
            if (isNaN(this.average)) {
                const teSummary = readFileSync(/** @type {string} */ (average), 'utf8').split('\n').slice(1);
                this.stats = Object.fromEntries(teSummary.map(line => {
                    const row = line.split(',');
                    return [ row[0], [ row[3], row[4] ]];
                }));
            }
        } else {
            throw new Error(`invalid parameters ${this.average} ${this.minDelta}`);
        }
    }

    /**
     * Process a translation unit during analysis.
     * @param {{ targetLang: string, tu: AnalyzerTU }} context - TU context.
     */
    processTU({ targetLang, tu }) {
        const source = makeCSVCompatibleString(tu.nsrc);
        const target = makeCSVCompatibleString(tu.ntgt);
        const avg = this.stats ? /** @type {number} */ (/** @type {unknown} */ (this.stats[targetLang][0])) : this.average;
        const delta = this.stats ? /** @type {number} */ (/** @type {unknown} */ (this.stats[targetLang][1])) * this.minDelta : this.minDelta;
        if (source && target && source.length > 0 && target.length > 0) {
            const growth = target.length >= source.length ? target.length / source.length - 1 : -source.length / target.length + 1;
            Math.abs(growth - avg) >= delta && this.foundTus.push([
                targetLang,
                tu.guid,
                source,
                target,
                growth.toFixed(2),
            ]);
        }
    }

    getAnalysis() {
        return {
            head: ['lang', 'guid', 'source', 'target', 'delta'],
            groupBy: ['lang'],
            body: this.foundTus,
        };
    }
}
