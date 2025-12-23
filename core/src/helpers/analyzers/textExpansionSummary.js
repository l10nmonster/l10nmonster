/**
 * @typedef {import('../../interfaces.js').Analyzer} Analyzer
 * @typedef {import('../../interfaces.js').AnalyzerTU} AnalyzerTU
 */

/**
 * Calculates the mean of a specific position in an array of number arrays.
 * @param {number[][]} numArray - Array of number arrays.
 * @param {number} position - Index position to calculate mean for.
 * @returns {number} The mean value.
 */
function mean(numArray, position) {
    return numArray.reduce((s, n) => s + n[position], 0) / numArray.length;
}

/**
 * Calculates the standard deviation of a specific position in an array.
 * @param {number[][]} numArray - Array of number arrays.
 * @param {number} position - Index position to calculate std dev for.
 * @returns {number} The standard deviation.
 */
function stdDev(numArray, position) {
    const meanValue = mean(numArray, position);
    return Math.sqrt(numArray.reduce((s, n) => s + (n[position] - meanValue) ** 2, 0) / (numArray.length - 1));
}

/**
 * Analyzer that computes text expansion statistics from TM.
 * @implements {Analyzer}
 */
export default class TextExpansionSummary {
    static help = 'compute average lengths, growth, and standard deviation based on TM contents';

    constructor() {

        /** @type {Record<string, number[][]>} */
        this.langStats = {};
    }

    /**
     * Process a translation unit during analysis.
     * @param {{ targetLang: string, tu: AnalyzerTU }} context - TU context.
     */
    processTU({ targetLang, tu }) {
        const source = tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('');
        const target = tu.ntgt.map(e => (typeof e === 'string' ? e : '')).join('');
        if (source && target && source.length > 0 && target.length > 0) {
            this.langStats[targetLang] ??= [];
            this.langStats[targetLang].push([
                source.length,
                target.length,
                target.length >= source.length ? target.length / source.length - 1 : -source.length / target.length + 1,
            ]);
        }
    }

    getAnalysis() {
        return {
            head: ['lang', 'avgSrc', 'avgTgt', 'avgGrowth', 'growthStdDev'],
            body: Object.entries(this.langStats).map(([targetLang, stats]) => [
                targetLang,
                mean(stats, 0).toFixed(1),
                mean(stats, 1).toFixed(1),
                mean(stats, 2).toFixed(2),
                stdDev(stats, 2).toFixed(2),
            ]),
        };
    }
}
