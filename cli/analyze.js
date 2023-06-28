import { writeFileSync } from 'fs';

import { analyzeCmd } from '@l10nmonster/core';
import { consoleColor } from './shared.js';

export class analyze {
    static help = {
        description: 'content reports and validation.',
        arguments: [
            [ '[analyzer]', 'name of the analyzer to run' ],
            [ '[params...]', 'optional parameters to the analyzer' ],
        ],
        options: [
            [ '-l, --lang <language>', 'target language to analyze (if TM analyzer)' ],
            [ '--filter <filter>', 'use the specified tu filter' ],
            [ '--output <filename>', 'filename to write the analysis to)' ],
        ]
    };

    static async action(monsterManager, options) {
        try {
            if (options.analyzer) {
                const analysis = await analyzeCmd(monsterManager, options.analyzer, options.params, options.lang, options.filter);
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
                for (const [name, analyzer] of Object.entries(monsterManager.analyzers)) {
                    console.log(`  ${typeof analyzer.prototype.processSegment === 'function' ? '(src)' : ' (tu)'} ${consoleColor.bright}${name} ${analyzer.helpParams ?? ''}${consoleColor.reset} ${analyzer.help}`);
                }
            }
        } catch (e) {
            console.error(`Failed to analyze: ${e.stack || e}`);
        }
    }
}
