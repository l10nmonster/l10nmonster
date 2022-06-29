export async function analyzeCmd(mm, Analyzer, params, limitToLang) {
    const driver = Analyzer.driver;
    if (['source', 'tm'].includes(driver)) {
        let analysis;
        if (driver === 'source') {
            const analyzer = new Analyzer(...params);
            const sources = await mm.source.getEntries();
            for (const [rid, res] of sources) {
                for (const seg of res.segments) {
                    analyzer.processSegment({ rid, prj: res.prj, seg });
                }
            }
            analysis = analyzer.getAnalysis();
        } else {
            const targetLangs = (await mm.source.getTargetLangs(limitToLang)).sort();
            const aggregateAnalysis = [];
            const hasAggregateAnalysis = Boolean(Analyzer.prototype.getAggregateAnalysis);
            let analyzer;
            for (const targetLang of targetLangs) {
                (!hasAggregateAnalysis || !analyzer) && (analyzer = new Analyzer(...params));
                const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
                const tus = tm.guids.map(guid => tm.getEntryByGuid(guid));
                for (const tu of tus) {
                    analyzer.processTU({ targetLang, tu });
                }
                !hasAggregateAnalysis && aggregateAnalysis.push(analyzer.getAnalysis());
            }
            analysis = hasAggregateAnalysis ? analyzer.getAggregateAnalysis() : aggregateAnalysis.flat(1);
        }
        return analysis;
    } else {
        throw `invalid ${driver} driver`;
    }
}
