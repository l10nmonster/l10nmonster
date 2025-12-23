import { writeFileSync } from 'fs';

import { consoleColor } from '../actions/shared.js';

/**
 * @typedef {Object} AnalyzeOptions
 * @property {string | string[]} [channel] - Channels to analyze
 * @property {string | string[]} [prj] - Projects to analyze
 * @property {string} [lang] - Target language for TM analysis
 * @property {string} [output] - Output filename
 * @property {string} [analyzer] - Analyzer name
 * @property {string[]} [params] - Parameters for the analyzer
 */

/**
 * CLI action for content reports and validation.
 * @type {import('../../index.js').L10nAction}
 */
export const analyze = {
    name: 'analyze',
    help: {
        description: 'content reports and validation.',
        arguments: [
            [ '[analyzer]', 'name of the analyzer to run' ],
            [ '[params...]', 'optional parameters to the analyzer' ],
        ],
        options: [
            [ '--channel <channel1,...>', 'limit translations to specified channels' ],
            [ '--prj <prj1,...>', 'limit translations to specified projects' ],
            [ '--lang <language>', 'target language to analyze (if TM analyzer)' ],
            [ '--output <filename>', 'filename to write the analysis to' ],
        ]
    },

    async action(mm, options) {
        const opts = /** @type {AnalyzeOptions} */ (options);
        const channels = opts.channel ? (Array.isArray(opts.channel) ? opts.channel : opts.channel.split(',')) : mm.rm.channelIds;
        const prj = opts.prj ? (Array.isArray(opts.prj) ? opts.prj : opts.prj.split(',')) : undefined;
        if (Array.isArray(prj) && channels.length > 1) {
            throw new Error('Cannot specify projects with more than one channel');
        }
        try {
            if (opts.analyzer) {
                const analysis = await mm.analyze(opts.analyzer, opts.params, opts.lang);
                const header = analysis.head;
                if (opts.output) {

                    /** @type {string[]} */
                    const rows = header ? [ header, ...analysis.body].map(row => row.join(',')) : /** @type {string[]} */ (/** @type {unknown} */ (analysis.body));
                    rows.push('\n');
                    writeFileSync(opts.output, rows.join('\n'));
                } else {
                    if (header) { // structured analysis
                        const groups = analysis.groupBy;
                        let previousGroup;
                        for (const row of analysis.body) {

                            /** @type {[unknown, number][]} */
                            const columns = row.map((col, idx) => /** @type {[unknown, number]} */ ([col, idx]));
                            if (groups) {
                                // eslint-disable-next-line no-unused-vars
                                const currentGroup = columns.filter(([col, idx]) => groups.includes(header[/** @type {number} */ (idx)]));
                                // eslint-disable-next-line no-unused-vars
                                const currentGroupSmashed = currentGroup.map(([col, idx]) => col).join('|');
                                if (currentGroupSmashed !== previousGroup) {
                                    previousGroup = currentGroupSmashed;
                                    console.log(currentGroup
                                        .map(([col, idx]) => `${consoleColor.dim}${header[/** @type {number} */ (idx)]}: ${consoleColor.reset}${consoleColor.bright}${col}${consoleColor.reset}`)
                                        .join('\t'));
                                }
                            }
                            const currentData = columns.filter(([col, idx]) => (!groups || !groups.includes(header[/** @type {number} */ (idx)])) && col !== null && col !== undefined);
                            console.log(currentData
                                .map(([col, idx]) => `\t${consoleColor.dim}${header[/** @type {number} */ (idx)]}: ${consoleColor.reset}${col}`)
                                .join(''));
                        }
                    } else { // unstructured analysis
                        console.log(analysis.body.join('\n'));
                    }
                }
            } else {
                console.log('Available analyzers:');
                for (const [name, analyzer] of Object.entries(mm.analyzers)) {
                    console.log(`  ${typeof analyzer.prototype.processSegment === 'function' ? '(src)' : ' (tu)'} ${consoleColor.bright}${name} ${analyzer.helpParams ?? ''}${consoleColor.reset} ${analyzer.help}`);
                }
            }
        } catch (e) {
            e.message && (e.message = `Failed to analyze: ${e.message}`);
            throw e;
        }
    },
};
