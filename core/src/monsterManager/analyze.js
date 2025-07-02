import { TU } from '../entities/tu.js';
import { utils } from '../helpers/index.js';

export async function analyzeCmd(mm, analyzer, params, limitToLang) {
    const Analyzer = mm.analyzers[utils.fixCaseInsensitiveKey(mm.analyzers, analyzer)];
    if (!Analyzer) {
        throw `couldn't find a ${analyzer} analyzer`;
    }
    if (typeof Analyzer.prototype.processSegment === 'function') { // this analyzer needs a source driver
        const analyzer = new Analyzer(...params);
        for await (const res of mm.rm.getAllResources()) {
            for (const seg of res.segments) {
                analyzer.processSegment({ rid: res.id, prj: res.prj, seg });
            }
        }
        return analyzer.getAnalysis();
    } else if (typeof Analyzer.prototype.processTU === 'function') { // this analyzer needs a tm driver
        const bodies = [];
        let lastAnalysis;
        const hasAggregateAnalysis = typeof Analyzer.prototype.getAggregateAnalysis === 'function';
        let analyzer;
        const desiredTargetLangs = new Set(await mm.getTargetLangs(limitToLang));
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs())
            .filter(pair => desiredTargetLangs.has(pair[1]));
        for (const [sourceLang, targetLang] of availableLangPairs) {
                (!hasAggregateAnalysis || !analyzer) && (analyzer = new Analyzer(...params));
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            for (const job of tm.getAllJobs()) {
                for (const tu of job.tus) {
                    analyzer.processTU({ targetLang, tu });
                }
            }
            !hasAggregateAnalysis && bodies.push((lastAnalysis = analyzer.getAnalysis()).body);
        }
        return hasAggregateAnalysis ? analyzer.getAggregateAnalysis() : { ...lastAnalysis, body: bodies.flat(1) };
    } else {
        throw `could not find processSegment or processTU function in analyzer`;
    }
}
