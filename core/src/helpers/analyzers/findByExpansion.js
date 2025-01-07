import { readFileSync } from 'fs';

const makeCSVCompatibleString = nstr => nstr.map(e => (typeof e === 'string' ? e : ''))
    .join('')
    .replaceAll(',', '')
    .replaceAll('\n', ' ');

export default class FindByExpansion {
    static helpParams = '<average|csvFile> <minDelta|sigmas>';
    static help = 'find in TM all translations that grew more than minDelta/sigma multiples of the average';

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
        const source = makeCSVCompatibleString(tu.nsrc);
        const target = makeCSVCompatibleString(tu.ntgt);
        const avg = this.stats ? this.stats[targetLang][0] : this.average;
        const delta = this.stats ? this.stats[targetLang][1] * this.minDelta : this.minDelta;
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
