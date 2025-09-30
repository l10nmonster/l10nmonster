import { writeFileSync } from 'fs';

import { consoleColor } from '../actions/shared.js';

export class analyze {
    static help = {
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
    };

    static async action(mm, options) {
        const channels = options.channel ? (Array.isArray(options.channel) ? options.channel : options.channel.split(',')) : mm.rm.channelIds;
        const prj = options.prj ? (Array.isArray(options.prj) ? options.prj : options.prj.split(',')) : undefined;
        if (Array.isArray(prj) && channels.length > 1) {
            throw new Error('Cannot specify projects with more than one channel');
        }
        try {
            if (options.analyzer) {
                const analysis = await mm.analyze(options.analyzer, options.params, options.lang);
                const header = analysis.head;
                if (options.output) {
                    const rows = header ? [ header, ...analysis.body].map(row => row.join(',')) : analysis.body;
                    rows.push('\n');
                    writeFileSync(options.output, rows.join('\n'));
                } else {
                    if (header) { // structured analysis
                        const groups = analysis.groupBy;
                        let previousGroup;
                        for (const row of analysis.body) {
                            const columns = row.map((col, idx) => [col, idx]);
                            if (groups) {
                                // eslint-disable-next-line no-unused-vars
                                const currentGroup = columns.filter(([col, idx]) => groups.includes(header[idx]));
                                // eslint-disable-next-line no-unused-vars
                                const currentGroupSmashed = currentGroup.map(([col, idx]) => col).join('|');
                                if (currentGroupSmashed !== previousGroup) {
                                    previousGroup = currentGroupSmashed;
                                    console.log(currentGroup
                                        .map(([col, idx]) => `${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${consoleColor.bright}${col}${consoleColor.reset}`)
                                        .join('\t'));
                                }
                            }
                            const currentData = columns.filter(([col, idx]) => (!groups || !groups.includes(header[idx])) && col !== null && col !== undefined);
                            console.log(currentData
                                .map(([col, idx]) => `\t${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${col}`)
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
    }
}
