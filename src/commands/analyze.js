import { makeTU, fixCaseInsensitiveKey } from '../shared.js';

export async function analyzeCmd(mm, Analyzer, params, limitToLang, tuFilter) {
    let tuFilterFunction;
    if (tuFilter) {
        tuFilter = fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
        tuFilterFunction = mm.tuFilters[tuFilter];
        if (!tuFilterFunction) {
            throw `Couldn't find ${tuFilter} tu filter`;
        }
    }
    if (typeof Analyzer.prototype.processSegment === 'function') { // this analyzer needs a source driver
        const analyzer = new Analyzer(...params);
        const resources = await mm.source.getResources();
        for (const res of resources) {
            for (const seg of res.segments) {
                (!tuFilterFunction || tuFilterFunction(makeTU(res, seg))) && analyzer.processSegment({ rid: res.id, prj: res.prj, seg });
            }
        }
        return analyzer.getAnalysis();
    } else if (typeof Analyzer.prototype.processTU === 'function') { // this analyzer needs a tm driver
        const targetLangs = (await mm.getTargetLangs(limitToLang)).sort();
        const bodies = [];
        let lastAnalysis;
        const hasAggregateAnalysis = typeof Analyzer.prototype.getAggregateAnalysis === 'function';
        let analyzer;
        for (const targetLang of targetLangs) {
            (!hasAggregateAnalysis || !analyzer) && (analyzer = new Analyzer(...params));
            const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
            const tus = tm.guids.map(guid => tm.getEntryByGuid(guid));
            for (const tu of tus) {
                (!tuFilterFunction || tuFilterFunction(tu)) && analyzer.processTU({ targetLang, tu });
            }
            !hasAggregateAnalysis && bodies.push((lastAnalysis = analyzer.getAnalysis()).body);
        }
        return hasAggregateAnalysis ? analyzer.getAggregateAnalysis() : { ...lastAnalysis, body: bodies.flat(1) };
    } else {
        throw `could not find processSegment or processTU function in analyzer`;
    }
}
