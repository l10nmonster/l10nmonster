export default class MismatchedTags {
    static help = 'find mismatched open/close placeholders in translations';
    static driver = 'tm';
    static analysisStructure = ['lang', 'guid', 'src', 'tgt'];
    static analysisGroupBy = ['lang'];

    constructor() {
        this.foundTus = [];
    }

    processTU({ targetLang, tu }) {
        if (tu.ntgt) {
            let nestingLevel = 0;
            for (const part of tu.ntgt) {
                if (part.t === 'bx') {
                    nestingLevel++;
                } else if (part.t === 'ex') {
                    nestingLevel--;
                    if (nestingLevel < 0) {
                        break;
                    }
                }
            }
            if (nestingLevel !== 0) {
                const src = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : `{${e.t}}`)).join('') : tu.src;
                const tgt = tu.ntgt ? tu.ntgt.map(e => (typeof e === 'string' ? e : `{${e.t}}`)).join('') : tu.tgt;
                this.foundTus.push([
                    targetLang,
                    tu.guid,
                    src,
                    tgt,
                ]);
            }
        }
    }

    getAnalysis() {
        return this.foundTus;
    }
}
