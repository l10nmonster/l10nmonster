export default class DuplicateSource {
    static help = 'find duplicate text in source that could be leveraged as qualified/unqualified';

    constructor() {
        this.qualifiedMatches = {}; // sid+src
        this.unqualifiedMatches = {}; // src only
    }

    processSegment({ rid, prj, seg }) {
        const gstr = seg.gstr;
        this.unqualifiedMatches[gstr] ??= [];
        this.unqualifiedMatches[gstr].push({ rid, prj, sid: seg.sid, gstr });
        const qStr = `${seg.sid}|${gstr}`;
        this.qualifiedMatches[qStr] ??= [];
        this.qualifiedMatches[qStr].push({ rid, prj, sid: seg.sid, gstr });
    }

    getAnalysis() {
        const analysis = {
            head: ['source', 'prj', 'rid', 'sid'],
            groupBy: ['source'],
            body: [],
        };
        const qualifiedRepetitions = Object.values(this.qualifiedMatches).filter(e => e.length > 1);
        const unqualifiedRepetitions = Object.values(this.unqualifiedMatches).filter(e => e.length > 1);
        for (const rep of [...qualifiedRepetitions, ...unqualifiedRepetitions]) {
            for (const r of rep) {
                analysis.body.push([rep[0].gstr, r.prj, r.rid, r.sid]);
            }
        }
        return analysis;
    }
}
