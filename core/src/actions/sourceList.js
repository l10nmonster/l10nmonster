import { writeFileSync } from 'fs';
import { consoleLog } from '@l10nmonster/core';

async function getStatusForAllPairs(mm, channelId, prj) {
    const status = {};
    const langPairs = await mm.rm.getAvailableLangPairs();
    for (const [ sourceLang, targetLang ] of langPairs) {
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const pairStatus = tm.getActiveContentTranslationStatus(channelId, prj);
        if (pairStatus.length > 0) {
            status[targetLang] ??= {};
            status[targetLang][sourceLang] = pairStatus;
        }
    }
    return status;
}

export class source_list {
    static help = {
        description: 'list source content and its channels and projects.',
        options: [
            [ '--detailed', 'show more details' ],
            [ '--statusFile <filename>', 'write status to the specified file' ],
        ]
    };

    static async action(mm, options) {
        consoleLog`Active Content Channels`;
        const overallStatus = {};
        for (const channelId of Object.keys(mm.rm.channels)) {
            consoleLog`\n  ‣ Channel ${channelId}`;
            const channelStats = await mm.rm.getChannelStats(channelId);
            overallStatus[channelId] = { channelStats, prjPairStatus: {} };
            for (const { prj, segmentCount, resCount } of channelStats) {
                consoleLog`    • Project ${prj ?? 'default'}: ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']} with ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']}`;
                const status = await getStatusForAllPairs(mm, channelId, prj);
                overallStatus[channelId].prjPairStatus[prj ?? 'default'] = status;
                for (const [targetLang, targetLangStatus] of Object.entries(status)) {
                    for (const [sourceLang, pairStats] of Object.entries(targetLangStatus)) {
                        const pairSummary = { untranslated: 0, "in flight": 0, translated: 0, "low quality": 0 };
                        const translatedDetails = [];
                        let totalSegments = 0;
                        for (const leverage of pairStats) {
                            const tuType = leverage.q === null ? 'untranslated' : (leverage.q === 0 ? 'in flight' : (leverage.q >= leverage.minQ ? 'translated' : 'low quality'));
                            pairSummary[tuType] += leverage.seg;
                            totalSegments += leverage.seg;
                            translatedDetails.push({
                                tuType,
                                minQ: leverage.minQ,
                                q: leverage.q,
                                res: leverage.res,
                                seg: leverage.seg,
                                words: leverage.words,
                                chars: leverage.chars
                            })
                        }
                        const pctTranslated = `(${((pairSummary.translated ?? 0) / totalSegments * 100).toPrecision(3)}%)`;
                        const translatedSummary = Object.entries(pairSummary).filter(([tuType, count]) => count > 0).map(([tuType, count]) => `${count.toLocaleString()} ${tuType}`).join(', ');
                        if (options.detailed) {
                            consoleLog`      ⁃ ${sourceLang} → ${targetLang} ${pctTranslated}`;
                            for (const details of translatedDetails) {
                                consoleLog`        • ${details.tuType} (q=${details.q ?? details.minQ}) ${details.res.toLocaleString()} ${[details.res, 'resource', 'resources']} with ${details.seg.toLocaleString()} ${[details.seg, 'segment', 'segments']} ${details.words.toLocaleString()} ${[details.words, 'word', 'words']} ${details.chars.toLocaleString()} ${[details.chars, 'char', 'chars']}`;
                            }
                        } else {
                            consoleLog`      ⁃ ${sourceLang} → ${targetLang} ${pctTranslated} segments: ${translatedSummary}`;
                        }
                    }
                }
            }
        }
        if (options.statusFile) {
            writeFileSync(options.statusFile, JSON.stringify(overallStatus, null, '\t'), 'utf8');
        }
    }
}
