import { utils } from "../index.js";

export default class SmellySource {
    static helpParams = '[smellyRegex]';
    static help = 'find all source segments that match the regular expression';

    constructor(smellyRegex) {
        this.smelly = [];
        this.smellyRegex = smellyRegex ? new RegExp(smellyRegex) : /[^a-zA-Z 0-9.,;:!()\-'?/+’“”]/;
    }

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
