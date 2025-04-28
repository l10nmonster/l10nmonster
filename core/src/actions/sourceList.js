import { writeFileSync } from 'fs';
import { consoleLog, styleString } from '@l10nmonster/core';

export class source_list {
    static help = {
        description: 'list source content and its channels and projects.',
        options: [
            [ '--srcLang <language>', 'limit to the specified source language' ],
            [ '--tgtLang <language>', 'limit to the specified target language' ],
            [ '--detailed', 'show more details' ],
            [ '--statusFile <filename>', 'write status to the specified file' ],
        ]
    };

    static async action(mm, options) {
        const pctFormatter = new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        });
        consoleLog`Active Content Channels`;
        const translationStatus = await mm.getTranslationStatus();
        for (const [ channelId, channelStatus ] of Object.entries(translationStatus)) {
            consoleLog`\n  ‣ Channel ${channelId}`;
            for (const [ prj, projectStatus ] of Object.entries(channelStatus)) {
                for (const [ sourceLang, statusBySourceLang ] of Object.entries(projectStatus)) {
                    if (options.srcLang && sourceLang !== options.srcLang) {
                        continue;
                    }
                    for (const [ targetLang, projectDetails ] of Object.entries(statusBySourceLang)) {
                        if (options.tgtLang && targetLang !== options.tgtLang) {
                            continue;
                        }
                        const { resCount, segmentCount, translationStatus } = projectDetails
                        const pairSummary = { untranslated: 0, "in flight": 0, translated: 0, "low quality": 0, words: 0, chars: 0 };
                        for (const { minQ, q, seg, words, chars } of translationStatus) {
                            const tuType = q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'));
                            pairSummary[tuType] += seg;
                            pairSummary.words += words;
                            pairSummary.chars += chars;
                        }
                        const pctTranslated = pctFormatter.format(pairSummary.translated / segmentCount);
                        const otherTranslations = `${pairSummary['in flight'] ? styleString`${pairSummary['in flight']} in flight ` : ''} ${pairSummary['low quality'] ? styleString`${pairSummary['low quality']} low quality ` : ''}`;
                        consoleLog`    • Project ${prj} (${sourceLang} → ${targetLang}): ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']} with ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} ${otherTranslations}${pairSummary.words.toLocaleString()} ${[pairSummary.words, 'word', 'words']} ${pairSummary.chars.toLocaleString()} ${[pairSummary.chars, 'char', 'chars']} (${pctTranslated} translated)`;
                        if (options.detailed) {
                            for (const { minQ, q, res, seg, words, chars } of translationStatus) {
                                const tuType = q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'));
                                consoleLog`      ⁃ ${tuType} (q=${q ?? minQ}) ${res.toLocaleString()} ${[res, 'resource', 'resources']} with ${seg.toLocaleString()} ${[seg, 'segment', 'segments']} ${words.toLocaleString()} ${[words, 'word', 'words']} ${chars.toLocaleString()} ${[chars, 'char', 'chars']}`;
                            }
                        }
                    }
                }
            }
        }
        if (options.statusFile) {
            writeFileSync(options.statusFile, JSON.stringify(translationStatus, null, '\t'), 'utf8');
            consoleLog`\nStatus file written to ${options.statusFile}`;
        }
    }
}
