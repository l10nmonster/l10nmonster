function mean(numArray, position) {
    return numArray.reduce((s, n) => s + n[position], 0) / numArray.length;
}

function stdDev(numArray, position) {
    const meanValue = mean(numArray, position);
    return Math.sqrt(numArray.reduce((s, n) => s + (n[position] - meanValue) ** 2, 0) / (numArray.length - 1));
}

export default class TextExpansionSummary {
    static help = 'compute average lengths, growth, and standard deviation based on TM contents';
    static driver = 'tm';
    static analysisStructure = ['lang', 'avgSrc', 'avgTgt', 'avgGrowth', 'growthStdDev'];

    constructor() {
        this.langStats = {};
    }

    processTU({ targetLang, tu }) {
        const src = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('') : tu.src;
        const tgt = tu.ntgt ? tu.ntgt.map(e => (typeof e === 'string' ? e : '')).join('') : tu.tgt;
        if (src && tgt && src.length > 0 && tgt.length > 0) {
            this.langStats[targetLang] ??= [];
            this.langStats[targetLang].push([
                src.length,
                tgt.length,
                tgt.length >= src.length ? tgt.length / src.length - 1 : -src.length / tgt.length + 1,
            ]);
        }
    }

    getAnalysis() {
        return Object.entries(this.langStats).map(([targetLang, stats]) => [
            targetLang,
            mean(stats, 0).toFixed(1),
            mean(stats, 1).toFixed(1),
            mean(stats, 2).toFixed(2),
            stdDev(stats, 2).toFixed(2),
        ]);
    }
}
