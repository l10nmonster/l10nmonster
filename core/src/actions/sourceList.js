/* eslint-disable complexity */
import { writeFileSync } from 'fs';
import { consoleLog, styleString } from '../l10nContext.js';

/**
 * @typedef {Object} SourceListOptions
 * @property {string | string[]} [channel] - Channel ID(s)
 * @property {boolean} [status] - Show translation status
 * @property {string} [srcLang] - Source language filter
 * @property {string} [tgtLang] - Target language filter
 * @property {boolean} [detailed] - Show detailed status
 * @property {string} [statusFile] - Output filename
 */

/**
 * CLI action for listing source content.
 * @type {import('../../index.js').L10nAction}
 */
export const source_list = {
    name: 'source_list',
    help: {
        description: 'list source content and its channels and projects.',
        options: [
            [ '--channel <channelId>', 'limit to the specified channels' ],
            [ '--status', 'show translation status' ],
            [ '--srcLang <language>', 'limit to the specified source language' ],
            [ '--tgtLang <language>', 'limit to the specified target language' ],
            [ '--detailed', 'show more details in translation status' ],
            [ '--statusFile <filename>', 'write status to the specified file' ],
        ]
    },

    async action(mm, options) {
        const opts = /** @type {SourceListOptions} */ (options);
        const channels = opts.channel ? (Array.isArray(opts.channel) ? opts.channel : opts.channel.split(',')) : mm.rm.channelIds;
        const withStatus = opts.status || opts.srcLang || opts.tgtLang || opts.detailed || opts.statusFile;
        const pctFormatter = new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        });
        const response = {};
        let translationStatus;
        if (withStatus) {
            consoleLog`Active Content Channels with Translation Status`;
            translationStatus = await mm.getTranslationStatus(channels);
            response.translationStatus = translationStatus;
            for (const [ channelId, channelStatus ] of Object.entries(translationStatus)) {
                consoleLog`\n  ‣ Channel ${channelId}`;
                for (const [ sourceLang, sourceStatus ] of Object.entries(channelStatus)) {
                    if (opts.srcLang && sourceLang !== opts.srcLang) {
                        continue;
                    }
                    for (const [ targetLang, projectStatus ] of Object.entries(sourceStatus)) {
                        if (opts.tgtLang && targetLang !== opts.tgtLang) {
                            continue;
                        }
                        consoleLog`    ${sourceLang} → ${targetLang}`;
                        for (const [ prj, projectStatusDetails ] of Object.entries(projectStatus)) {
                            const { translatedDetails, untranslatedDetails, pairSummary, pairSummaryByStatus } = /** @type {{ translatedDetails: unknown[], untranslatedDetails: Record<string, unknown[]>, pairSummary: { segs: number, words: number, chars: number }, pairSummaryByStatus: Record<string, number> }} */ (projectStatusDetails);
                            const pctTranslated = pairSummary.segs > 0 ? pctFormatter.format(pairSummaryByStatus.translated / pairSummary.segs) : '100%';
                            const segStatus = Object.entries(pairSummaryByStatus).filter(e => e[1]).map(([status, segs]) => styleString`${status}: ${segs.toLocaleString()}`).join(', ');
                            consoleLog`      • Project ${prj}: ${pairSummary.segs.toLocaleString()} ${[pairSummary.segs, 'segment', 'segments']} (${segStatus}) ${pairSummary.words.toLocaleString()} ${[pairSummary.words, 'word', 'words']} ${pairSummary.chars.toLocaleString()} ${[pairSummary.chars, 'char', 'chars']} (${pctTranslated} translated)`;
                            if (opts.detailed) {
                                // Show translated content details
                                for (const details of translatedDetails) {
                                    const { minQ, q, res, seg, words, chars } = /** @type {{ minQ: number, q: number, res: number, seg: number, words: number, chars: number }} */ (details);
                                    const status = q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality');
                                    consoleLog`        ⁃ ${status} (minQ=${minQ}, q=${q || 'none'}) ${res.toLocaleString()} ${[res, 'resource', 'resources']} with ${seg.toLocaleString()} ${[seg, 'segment', 'segments']} ${words.toLocaleString()} ${[words, 'word', 'words']} ${chars.toLocaleString()} ${[chars, 'char', 'chars']}`;
                                }
                                // Show untranslated content details grouped by group
                                for (const [ group, groupDetails ] of Object.entries(untranslatedDetails)) {
                                    const groupName = group === 'null' ? '(no group)' : group;
                                    for (const details of /** @type {unknown[]} */ (groupDetails)) {
                                        const { minQ, seg, words, chars } = /** @type {{ minQ: number, seg: number, words: number, chars: number }} */ (details);
                                        consoleLog`        ⁃ untranslated [${groupName}] (minQ=${minQ}) ${seg.toLocaleString()} ${[seg, 'segment', 'segments']} ${words.toLocaleString()} ${[words, 'word', 'words']} ${chars.toLocaleString()} ${[chars, 'char', 'chars']}`;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            consoleLog`Active Content Channels`;
            response.channelStats = {};
            for (const channelId of channels) {
                const channelStats = await mm.rm.getActiveContentStats(channelId);
                response.channelStats[channelId] = channelStats;
                const lastModified = channelStats.length > 0 ? new Date(Math.max(...channelStats.map(({ lastModified }) => new Date(lastModified).getTime()))) : null;
                consoleLog`\n  ‣ Channel ${channelId} ${lastModified ? styleString`- last modified ${lastModified}` : ''}`;
                channelStats.forEach(({ prj, sourceLang, targetLangs, segmentCount, resCount, lastModified }) => consoleLog`      • Project ${prj ?? 'default'} (${sourceLang} → ${targetLangs.length === 0 ? '∅' : targetLangs.join(', ')}): ${segmentCount.toLocaleString()} ${[segmentCount, 'segment', 'segments']} in ${resCount.toLocaleString()} ${[resCount, 'resource', 'resources']} - last modified ${new Date(lastModified)}`);
            }
        }
        if (opts.statusFile) {
            writeFileSync(opts.statusFile, JSON.stringify(translationStatus, null, '\t'), 'utf8');
            consoleLog`\nStatus file written to ${opts.statusFile}`;
        }
        return response;
    },
};
