function nestingIsValid(normalizedString) {
    if (!Array.isArray(normalizedString)) {
        return true;
    }
    let nestingLevel = 0;
    for (const part of normalizedString) {
        if (part.t === 'bx') {
            nestingLevel++;
        } else if (part.t === 'ex') {
            nestingLevel--;
            if (nestingLevel < 0) {
                break;
            }
        }
    }
    return nestingLevel === 0;
}

function makeCSVCompatibleString(nstr) {
    return nstr.map(e => (typeof e === 'string' ? e : `{${e.t}}`)).join('').replaceAll(',', '').replaceAll('\n', ' ');
}

export default class MismatchedTags {
    static help = 'find mismatched open/close placeholders in translations';

    constructor() {
        this.foundTus = [];
    }

    processTU({ targetLang, tu }) {
        if (nestingIsValid(tu.nsrc) && !nestingIsValid(tu.ntgt)) {
            this.foundTus.push([
                targetLang,
                tu.guid,
                makeCSVCompatibleString(tu.nsrc ?? tu.src),
                makeCSVCompatibleString(tu.ntgt ?? tu.tgt),
            ]);
        }
    }

    getAnalysis() {
        return {
            head: ['lang', 'guid', 'src', 'tgt'],
            groupBy: ['lang'],
            body: this.foundTus,
        };
    }
}
