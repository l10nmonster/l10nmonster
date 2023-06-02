export default class DuplicateSource {
    static help = 'find duplicate text in source that could be leveraged as qualified/unqualified';

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
        const analysis = {
            head: ['str', 'prj', 'rid', 'sid'],
            groupBy: ['str'],
            body: [],
        };
        const qualifiedRepetitions = Object.values(this.qualifiedMatches).filter(e => e.length > 1);
        const unqualifiedRepetitions = Object.values(this.unqualifiedMatches).filter(e => e.length > 1);
        for (const rep of [...qualifiedRepetitions, ...unqualifiedRepetitions]) {
            for (const r of rep) {
                analysis.body.push([rep[0].str, r.prj, r.rid, r.sid]);
            }
        }
        return analysis;
    }
}
