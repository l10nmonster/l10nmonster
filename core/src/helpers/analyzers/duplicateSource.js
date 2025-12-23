import { utils } from "../index.js";

/**
 * @typedef {import('../../interfaces.js').Analyzer} Analyzer
 * @typedef {import('../../interfaces.js').NormalizedSegment} NormalizedSegment
 */

/**
 * Analyzer that finds duplicate text in source that could be leveraged.
 * @implements {Analyzer}
 */
export default class DuplicateSource {
    static help = 'find duplicate text in source that could be leveraged as qualified/unqualified';

    constructor() {

        /** @type {Record<string, Array<{rid: string, prj: string, sid: string, gstr: string}>>} */
        this.qualifiedMatches = {}; // sid+src
        /** @type {Record<string, Array<{rid: string, prj: string, sid: string, gstr: string}>>} */
        this.unqualifiedMatches = {}; // src only
    }

    /**
     * Process a segment during analysis.
     * @param {{ rid: string, prj: string, seg: NormalizedSegment }} context - Segment context.
     */
    processSegment({ rid, prj, seg }) {
        const gstr = utils.flattenNormalizedSourceToOrdinal(seg.nstr);
        this.unqualifiedMatches[gstr] ??= [];
        this.unqualifiedMatches[gstr].push({ rid, prj, sid: seg.sid, gstr });
        const qStr = `${seg.sid}|${gstr}`;
        this.qualifiedMatches[qStr] ??= [];
        this.qualifiedMatches[qStr].push({ rid, prj, sid: seg.sid, gstr });
    }

    /**
     * Get the analysis results.
     * @returns {import('../../interfaces.js').AnalysisResult} Analysis result with headers and data rows.
     */
    getAnalysis() {

        /** @type {import('../../interfaces.js').AnalysisResult} */
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
