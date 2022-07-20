import {
    readFileSync,
} from 'fs';

export default class FindByExpansion {
    static helpParams = '<average|csvFile> <minDelta|sigmas>';
    static help = 'find in TM all translations that grew more than minDelta/sigma multiples from average';
    static driver = 'tm';
    static analysisStructure = ['lang', 'guid', 'src', 'tgt', 'delta'];
    static analysisGroupBy = ['lang'];

    constructor(average, minDelta) {
        this.foundTus = [];
        this.average = Number(average);
        this.minDelta = Number(minDelta);
        if (this.minDelta > 0) {
            if (isNaN(this.average)) {
                const teSummary = readFileSync(average, 'utf8').split('\n').slice(1);
                this.stats = Object.fromEntries(teSummary.map(line => {
                    const row = line.split(',');
                    return [ row[0], [ row[3], row[4] ]];
                }));
            }
        } else {
            throw `invalid parameters ${this.average} ${this.minDelta}`;
        }
    }

    processTU({ targetLang, tu }) {
        const src = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('') : tu.src;
        const tgt = tu.ntgt ? tu.ntgt.map(e => (typeof e === 'string' ? e : '')).join('') : tu.tgt;
        const avg = this.stats ? this.stats[targetLang][0] : this.average;
        const delta = this.stats ? this.stats[targetLang][1] * this.minDelta : this.minDelta;
        if (src && tgt && src.length > 0 && tgt.length > 0) {
            const growth = tgt.length >= src.length ? tgt.length / src.length - 1 : -src.length / tgt.length + 1;
            Math.abs(growth - avg) >= delta && this.foundTus.push([
                targetLang,
                tu.guid,
                src,
                tgt,
                growth.toFixed(2),
            ]);
        }
    }

    getAnalysis() {
        return this.foundTus;
    }
}
