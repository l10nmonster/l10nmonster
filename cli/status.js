import { writeFileSync } from 'fs';

import { statusCmd } from '@l10nmonster/core';
import { consoleColor } from './shared.js';

function computeTotals(totals, partial) {
    for (const [ k, v ] of Object.entries(partial)) {
        if (typeof v === 'object') {
            totals[k] ??= {};
            computeTotals(totals[k], v);
        } else {
            totals[k] ??= 0;
            totals[k] += v;
        }
    }
}

function printLeverage(leverage, detailed) {
    const totalStrings = leverage.translated + leverage.pending + leverage.untranslated + leverage.internalRepetitions;
    detailed && console.log(`    - total strings for target language: ${totalStrings.toLocaleString()} (${leverage.translatedWords.toLocaleString()} translated words)`);
    for (const [q, num] of Object.entries(leverage.translatedByQ).sort((a,b) => b[1] - a[1])) {
        detailed && console.log(`    - translated strings @ quality ${q}: ${num.toLocaleString()}`);
    }
    leverage.pending && console.log(`    - strings pending translation: ${leverage.pending.toLocaleString()} (${leverage.pendingWords.toLocaleString()} words)`);
    leverage.untranslated && console.log(`    - untranslated unique strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * .2).toFixed(2)})`);
    leverage.internalRepetitions && console.log(`    - untranslated repeated strings: ${leverage.internalRepetitions.toLocaleString()} (${leverage.internalRepetitionWords.toLocaleString()} words)`);
}

export class status {
    static help = {
        description: 'translation status of content.',
        options: [
            [ '-l, --lang <language>', 'only get status of target language' ],
            [ '-a, --all', 'show information for all projects, not just untranslated ones' ],
            [ '--output <filename>', 'write status to the specified file' ],
        ]
    };

    static async action(monsterManager, options) {
        const limitToLang = options.lang;
        const all = Boolean(options.all);
        const output = options.output;
        const status = await statusCmd(monsterManager, { limitToLang });
        if (output) {
            writeFileSync(output, JSON.stringify(status, null, '\t'), 'utf8');
        } else {
            console.log(`${consoleColor.reset}${status.numSources.toLocaleString()} translatable resources`);
            for (const [lang, langStatus] of Object.entries(status.lang)) {
                console.log(`\n${consoleColor.bright}Language ${lang}${consoleColor.reset} (minimum quality: ${langStatus.leverage.minimumQuality})`);
                const totals = {};
                const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
                for (const [prj, leverage] of prjLeverage) {
                    computeTotals(totals, leverage);
                    const untranslated = leverage.pending + leverage.untranslated + leverage.internalRepetitions;
                    if (leverage.translated + untranslated > 0) {
                        (all || untranslated > 0) && console.log(`  Project: ${consoleColor.bright}${prj}${consoleColor.reset}`);
                        printLeverage(leverage, all);
                    }
                }
                if (prjLeverage.length > 1) {
                    console.log(`  Total:`);
                    printLeverage(totals, true);
                }
            }
        }
        return status;
    }
}
