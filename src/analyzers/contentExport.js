function makeCSVCompatibleString(nstr) {
    return nstr.map(e => (typeof e === 'string' ? e : `{${e?.t}}`)).join('').replaceAll(',', '').replaceAll('\n', ' ');
}

export class FindInTarget {
    static helpParams = '[regex]';
    static help = 'find a_bx_bold kind of text in translations or the desired regex';

    constructor(regex) {
        this.foundTus = [];
        this.regex = (regex && new RegExp(regex)) ?? /(?<ph>(?<phIdx>[a-y]|z\d+)_(?<t>x|bx|ex)_(?<phName>[0-9A-Za-z_]*))/;
    }

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
            head: ['lang', 'guid', 'tgt'],
            groupBy: ['lang'],
            body: this.foundTus,
        };
    }
}

export class ExportTranslationGrid {
    static help = 'export side by side translations';

    constructor() {
        this.langs = {};
        this.grid = {};
    }

    processTU({ targetLang, tu }) {
        this.langs[targetLang] = true;
        this.grid[tu.guid] ??= { src: makeCSVCompatibleString(tu.nsrc || [ tu.src ]) };
        this.grid[tu.guid][targetLang] = makeCSVCompatibleString(tu.ntgt || [ tu.tgt ]);
    }

    getAggregateAnalysis() {
        return {
            head: [ 'guid', 'src', ...Object.keys(this.langs)],
            groupBy: ['lang'],
            body: Object.entries(this.grid).map(([guid, tx]) => [
                guid,
                tx.src,
                ...Object.keys(this.langs).map(lang => tx[lang] || '')
            ]),
        };
    }
}
