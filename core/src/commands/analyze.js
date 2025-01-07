import { TU, utils } from '@l10nmonster/core';

export async function analyzeCmd(mm, analyzer, params, limitToLang, tuFilter) {
    const Analyzer = mm.analyzers[utils.fixCaseInsensitiveKey(mm.analyzers, analyzer)];
    if (!Analyzer) {
        throw `couldn't find a ${analyzer} analyzer`;
    }
    let tuFilterFunction;
    if (tuFilter) {
        tuFilter = utils.fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
        tuFilterFunction = mm.tuFilters[tuFilter];
        if (!tuFilterFunction) {
            throw `Couldn't find ${tuFilter} tu filter`;
        }
    }
    if (typeof Analyzer.prototype.processSegment === 'function') { // this analyzer needs a source driver
        const analyzer = new Analyzer(...params);
        for await (const res of mm.rm.getAllResources()) {
            for (const seg of res.segments) {
                (!tuFilterFunction || tuFilterFunction(TU.fromSegment(res, seg))) && analyzer.processSegment({ rid: res.id, prj: res.prj, seg });
            }
        }
        return analyzer.getAnalysis();
    } else if (typeof Analyzer.prototype.processTU === 'function') { // this analyzer needs a tm driver
        const bodies = [];
        let lastAnalysis;
        const hasAggregateAnalysis = typeof Analyzer.prototype.getAggregateAnalysis === 'function';
        let analyzer;
        const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
        const availableLangPairs = (await mm.jobStore.getAvailableLangPairs())
            .filter(pair => desiredTargetLangs.has(pair[1]));
        for (const [sourceLang, targetLang] of availableLangPairs) {
                (!hasAggregateAnalysis || !analyzer) && (analyzer = new Analyzer(...params));
            const tm = await mm.tmm.getTM(sourceLang, targetLang);
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
