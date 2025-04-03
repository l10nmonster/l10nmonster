import { consoleLog } from '@l10nmonster/core';

async function getStatusForAllPairs(mm, channelId, prj) {
    const status = {};
    const langPairs = await mm.rm.getAvailableLangPairs();
    for (const [ sourceLang, targetLang ] of langPairs) {
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        status[targetLang] ??= {};
        status[targetLang][sourceLang] = tm.getActiveContentTranslationStatus(channelId, prj);
    }
    return status;
}

export class source_list {
    static help = {
        description: 'list source content and its channels and projects.',
        options: [
        ]
    };

    static async action(mm) {
        consoleLog`Active Content Channels`;
        for (const channelId of Object.keys(mm.rm.channels)) {
            consoleLog`\n  ‣ Channel ${channelId}`;
            const channelStats = await mm.rm.getChannelStats(channelId);
            for (const { prj, segmentCount, resCount } of channelStats) {
                consoleLog`    • Project ${prj ?? 'default'}: ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} in ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']}`;
                const status = await getStatusForAllPairs(mm, channelId, prj);
                for (const [targetLang, targetLangStatus] of Object.entries(status)) {
                    for (const [sourceLang, pairStats] of Object.entries(targetLangStatus)) {
                        // console.dir(pairStats, { depth: null });
                        const pairSummary = { untranslated: 0, "in flight": 0, translated: 0, "low quality": 0 };
                        const translatedDetails = [];
                        let totalSegments = 0;
                        for (const leverage of pairStats) {
                            const tuType = leverage.q === null ? 'untranslated' : (leverage.q === 0 ? 'in flight' : (leverage.q >= leverage.minQ ? 'translated' : 'low quality'));
                            pairSummary[tuType] += leverage.seg;
                            totalSegments += leverage.seg;
                            translatedDetails.push({
                                tuType,
                                q: leverage.q,
                                res: leverage.res,
                                seg: leverage.seg,
                                words: leverage.words,
                                chars: leverage.chars
                            })
                        }
                        const pctTranslated = `(${((pairSummary.translated ?? 0) / totalSegments * 100).toPrecision(3)}%)`;
                        const translatedSummary = Object.entries(pairSummary).filter(([tuType, count]) => count > 0).map(([tuType, count]) => `${count.toLocaleString()} ${tuType}`).join(', ');
                        consoleLog`      ⁃ ${sourceLang} → ${targetLang} ${pctTranslated} segments: ${translatedSummary}`;
                        // TODO: have options to show details
                        // consoleLog`        • ${tuType} ${leverage.res.toLocaleString()} ${[leverage.res, 'resource', 'resources']} with ${leverage.seg.toLocaleString()} ${[leverage.seg, 'segment', 'segments']} ${leverage.words.toLocaleString()} ${[leverage.words, 'word', 'words']} ${leverage.chars.toLocaleString()} ${[leverage.chars, 'char', 'chars']}`;
                    }
                }
            }
        }
    }
}
