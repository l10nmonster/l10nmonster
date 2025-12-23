import { utils } from "../index.js";

/**
 * @typedef {import('../../interfaces.js').Analyzer} Analyzer
 * @typedef {import('../../interfaces.js').NormalizedSegment} NormalizedSegment
 */

/**
 * Analyzer that finds source segments matching a regex pattern.
 * @implements {Analyzer}
 */
export default class SmellySource {
    static helpParams = '[smellyRegex]';
    static help = 'find all source segments that match the regular expression';

    /**
     * @param {string} [smellyRegex] - Optional regex pattern to match.
     */
    constructor(smellyRegex) {

        /** @type {Array<[string, string, string, string]>} */
        this.smelly = [];
        this.smellyRegex = smellyRegex ? new RegExp(smellyRegex) : /[^a-zA-Z 0-9.,;:!()\-'?/+'""]/;
    }

    /**
     * Process a segment during analysis.
     * @param {{ rid: string, prj: string, seg: NormalizedSegment }} context - Segment context.
     */
    processSegment({ rid, prj, seg }) {
        const gstr = utils.flattenNormalizedSourceToOrdinal(seg.nstr);
        if (this.smellyRegex.test(gstr)) {
            this.smelly.push([prj, rid, seg.sid, gstr]);
        }
    }

    getAnalysis() {
        return {
            head: ['prj', 'rid', 'sid', 'str'],
            groupBy: ['prj', 'rid'],
            body: this.smelly,
        };
    }
}
