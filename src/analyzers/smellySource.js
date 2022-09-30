export default class SmellySource {
    static helpParams = '[smellyRegex]';
    static help = 'find all source segments that match the regular expression';

    constructor(smellyRegex) {
        this.smelly = [];
        this.smellyRegex = smellyRegex ? new RegExp(smellyRegex) : /[^a-zA-Z 0-9.,;:!()\-'?/+’“”]/;
    }

    processSegment({ rid, prj, seg }) {
        const content = seg?.nstr?.map(e => (typeof e === 'string' ? e : ''))?.join('') || seg.str;
        if (this.smellyRegex.test(content)) {
            this.smelly.push([prj, rid, seg.sid, content]);
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
