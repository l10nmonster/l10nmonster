import { writeFileSync } from 'fs';
import { consoleLog } from '@l10nmonster/core';

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
    detailed && consoleLog`    - total strings for target language: ${totalStrings.toLocaleString()} (${leverage.translatedWords.toLocaleString()} translated words)`;
    for (const [q, num] of Object.entries(leverage.translatedByQ).sort((a,b) => b[1] - a[1])) {
        detailed && consoleLog`    - translated strings @ quality ${q}: ${num.toLocaleString()}`;
    }
    leverage.pending && consoleLog`    - strings pending translation: ${leverage.pending.toLocaleString()} (${leverage.pendingWords.toLocaleString()} words)`;
    leverage.untranslated && consoleLog`    - untranslated unique strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * .2).toFixed(2)})`;
    leverage.internalRepetitions && consoleLog`    - untranslated repeated strings: ${leverage.internalRepetitions.toLocaleString()} (${leverage.internalRepetitionWords.toLocaleString()} words)`;
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
        const status = await monsterManager.status({ limitToLang });
        if (output) {
            writeFileSync(output, JSON.stringify(status, null, '\t'), 'utf8');
        } else {
            consoleLog`${status.numSources.toLocaleString()} translatable resources`;
            for (const [lang, langStatus] of Object.entries(status.lang)) {
                consoleLog`\nLanguage ${lang} (minimum quality: ${langStatus.leverage.minimumQuality})`;
                const totals = {};
                const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
                for (const [prj, leverage] of prjLeverage) {
                    computeTotals(totals, leverage);
                    const untranslated = leverage.pending + leverage.untranslated + leverage.internalRepetitions;
                    if (leverage.translated + untranslated > 0) {
                        (all || untranslated > 0) && consoleLog`  Project: ${prj}`;
                        printLeverage(leverage, all);
                    }
                }
                if (prjLeverage.length > 1) {
                    consoleLog`  Total:`;
                    printLeverage(totals, true);
                }
            }
        }
        return status;
    }
}
