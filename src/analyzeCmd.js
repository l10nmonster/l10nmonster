import wordsCountModule from 'words-count';
import { getNormalizedString } from './normalizers/util.js';

export async function analyzeCmd(mm) {
    const sources = await mm.source.getEntries();
    const qualifiedMatches = {}; // sid+src
    const unqualifiedMatches = {}; // src only
    let numStrings = 0;
    let totalWC = 0;
    const smellyRegex = /[^a-zA-Z 0-9.,;:!()\-'?/+’“”]/;
    const smelly = [];
    for (const [rid, res] of sources) {
        const pipeline = mm.contentTypes[res.contentType];
        for (const seg of res.segments) {
            numStrings++;
            const wc = wordsCountModule.wordsCount(seg.str);
            totalWC += wc;
            const qGuid = mm.generateGuid(`${seg.sid}|${seg.str}`);
            unqualifiedMatches[seg.str] = unqualifiedMatches[seg.str] ?? [];
            unqualifiedMatches[seg.str].push({ rid, sid: seg.sid, str: seg.str, wc, qGuid });
            qualifiedMatches[qGuid] = qualifiedMatches[qGuid] ?? [];
            qualifiedMatches[qGuid].push({ rid, sid: seg.sid, str: seg.str, wc });
            let content = seg.str;
            if (pipeline.decoders) {
                const parts = getNormalizedString(content, pipeline.decoders);
                content = parts.map(e => (typeof e === 'string' ? e : '')).join('');
            }
            if (smellyRegex.test(content)) {
                smelly.push({ rid, sid: seg.sid, str: content });
            }
        }
    }
    for (const [k, v] of Object.entries(unqualifiedMatches)) {
        v.length === 1 && delete unqualifiedMatches[k]
    }
    for (const [k, v] of Object.entries(qualifiedMatches)) {
        v.length === 1 && delete qualifiedMatches[k]
    }
    return {
        numSources: sources.length,
        numStrings,
        totalWC,
        unqualifiedRepetitions: Object.values(unqualifiedMatches),
        qualifiedRepetitions: Object.values(qualifiedMatches),
        smelly,
    };
}
