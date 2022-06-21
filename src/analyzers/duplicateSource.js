export default class DuplicateSource {
    static help = 'find duplicate text in source that could be leveraged as qualified/unqualified';
    static driver = 'source';
    static analysisStructure = ['str', 'prj', 'rid', 'sid'];
    static analysisGroupBy = ['str'];

    constructor() {
        this.qualifiedMatches = {}; // sid+src
        this.unqualifiedMatches = {}; // src only
    }

    processSegment({ rid, prj, seg }) {
        const str = seg.gstr || seg.str;
                this.unqualifiedMatches[str] ??= [];
                this.unqualifiedMatches[str].push({ rid, prj, sid: seg.sid, str });
                const qStr = `${seg.sid}|${str}`;
                this.qualifiedMatches[qStr] ??= [];
                this.qualifiedMatches[qStr].push({ rid, prj, sid: seg.sid, str });
    }

    getAnalysis() {
        const analysis = [];
        const qualifiedRepetitions = Object.values(this.qualifiedMatches).filter(e => e.length > 1);
        const unqualifiedRepetitions = Object.values(this.unqualifiedMatches).filter(e => e.length > 1);
        for (const rep of [...qualifiedRepetitions, ...unqualifiedRepetitions]) {
            for (const r of rep) {
                analysis.push([rep[0].str, r.prj, r.rid, r.sid]);
            }
        }
        return analysis;
    }
}
