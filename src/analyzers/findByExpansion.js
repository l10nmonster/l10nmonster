export default class FindByExpansion {
    static helpParams = '<minGrowth>';
    static help = 'find in TM all translations that grew more than minGrowth in length';
    static driver = 'tm';
    static analysisStructure = ['lang', 'guid', 'src', 'tgt', 'growth'];
    static analysisGroupBy = ['lang'];

    constructor(minGrowth) {
        this.foundTus = [];
        this.minGrowth = Number(minGrowth);
        if (!(this.minGrowth > 0)) {
            throw `invalid minimum growth ${this.minGrowth}`;
        }
    }

    processTU({ targetLang, tu }) {
        const src = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('') : tu.src;
        const tgt = tu.ntgt ? tu.ntgt.map(e => (typeof e === 'string' ? e : '')).join('') : tu.tgt;
        if (src && tgt && src.length > 0 && tgt.length > 0) {
            const growth = tgt.length >= src.length ? tgt.length / src.length - 1 : -src.length / tgt.length + 1;
            Math.abs(growth) >= this.minGrowth && this.foundTus.push([
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
