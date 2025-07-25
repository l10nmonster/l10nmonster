import { writeFileSync } from 'fs';
import { consoleLog, styleString } from '../l10nContext.js';
import { groupObjectsByNestedProps } from '../sharedFunctions.js';

export class source_list {
    static help = {
        description: 'list source content and its channels and projects.',
        options: [
            [ '--status', 'show translation status' ],
            [ '--srcLang <language>', 'limit to the specified source language' ],
            [ '--tgtLang <language>', 'limit to the specified target language' ],
            [ '--detailed', 'show more details in translation status' ],
            [ '--statusFile <filename>', 'write status to the specified file' ],
        ]
    };

    static async action(mm, options) {
        const withStatus = options.status || options.srcLang || options.tgtLang || options.detailed || options.statusFile;
        const pctFormatter = new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        });
        const response = {};
        let translationStatus;
        if (withStatus) {
            consoleLog`Active Content Channels with Translation Status`;
            translationStatus = await mm.getTranslationStatus();
            response.translationStatus = translationStatus;
            for (const [ sourceLang, sourceStatus ] of Object.entries(translationStatus)) {
                if (options.srcLang && sourceLang !== options.srcLang) {
                    continue;
                }
                for (const [ targetLang, channelStatus ] of Object.entries(sourceStatus)) {
                    if (options.tgtLang && targetLang !== options.tgtLang) {
                        continue;
                    }
                    consoleLog`${sourceLang} → ${targetLang}`;
                    for (const [ channelId, projectStatus ] of Object.entries(channelStatus)) {
                        consoleLog`  ‣ Channel ${channelId}`;
                        for (const [ prj, translationStatus ] of Object.entries(projectStatus)) {
                            const pairSummary = { segs: 0, words: 0, chars: 0 };
                            const pairSummaryByStatus = { translated: 0, 'low quality': 0, 'in flight': 0, 'untranslated': 0 };
                            for (const { minQ, q, seg, words, chars } of translationStatus) {
                                pairSummary.segs += seg;
                                pairSummaryByStatus[q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'))] += seg;
                                pairSummary.words += words;
                                pairSummary.chars += chars;
                            }
                            const pctTranslated = pctFormatter.format(pairSummaryByStatus.translated / pairSummary.segs);
                            const segStatus = Object.entries(pairSummaryByStatus).filter(e => e[1]).map(([status, segs]) => styleString`${status}: ${segs}`).join(', ');
                            consoleLog`    • Project ${prj}: ${pairSummary.segs.toLocaleString()} ${[pairSummary.segs, 'segment', 'segments']} (${segStatus}) ${pairSummary.words.toLocaleString()} ${[pairSummary.words, 'word', 'words']} ${pairSummary.chars.toLocaleString()} ${[pairSummary.chars, 'char', 'chars']} (${pctTranslated} translated)`;
                            if (options.detailed) {
                                for (const { minQ, q, res, seg, words, chars } of translationStatus) {
                                    const status = q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'));
                                    consoleLog`      ⁃ ${status} (minQ=${minQ}, q=${q || 'none'}) ${res.toLocaleString()} ${[res, 'resource', 'resources']} with ${seg.toLocaleString()} ${[seg, 'segment', 'segments']} ${words.toLocaleString()} ${[words, 'word', 'words']} ${chars.toLocaleString()} ${[chars, 'char', 'chars']}`;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            consoleLog`Active Content Channels`;
            response.channelStats = {};
            for (const channelId of Object.keys(mm.rm.channels)) {
                const channelStats = await mm.rm.getActiveContentStats(channelId);
                response.channelStats[channelId] = channelStats;
                const lastModified = channelStats.length > 0 ? new Date(Math.max(...channelStats.map(({ lastModified }) => new Date(lastModified)))) : null;
                consoleLog`\n  ‣ Channel ${channelId} ${lastModified ? styleString`- last modified ${lastModified}` : ''}`;
                channelStats.forEach(({ prj, sourceLang, targetLangs, segmentCount, resCount, lastModified }) => consoleLog`      • Project ${prj ?? 'default'} (${sourceLang} → ${targetLangs.length === 0 ? '∅' : targetLangs.join(', ')}): ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} in ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']} - last modified ${new Date(lastModified)}`);
            }
        }
        if (options.statusFile) {
            writeFileSync(options.statusFile, JSON.stringify(translationStatus, null, '\t'), 'utf8');
            consoleLog`\nStatus file written to ${options.statusFile}`;
        }
        return response;
    }
}
