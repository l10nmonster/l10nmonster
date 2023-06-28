import { translateCmd } from '@l10nmonster/core';
import { consoleColor } from './shared.js';

export class translate {
    static help = {
        description: 'generate translated resources based on latest source and translations.',
        options: [
            [ '-l, --lang <language>', 'target language to translate' ],
            [ '-d, --dryrun', 'simulate translating and compare with existing translations' ],
        ]
    };

    static async action(monsterManager, options) {
        const limitToLang = options.lang;
        const dryRun = options.dryrun;
        console.log(`Generating translated resources for ${limitToLang ? limitToLang : 'all languages'}...${dryRun ? ' (dry run)' : ''}`);
        const status = await translateCmd(monsterManager, { limitToLang, dryRun });
        if (dryRun) {
            for (const [lang, diff] of Object.entries(status.diff)) {
                for (const [fname, lines] of Object.entries(diff)) {
                    console.log(`${lang}: diffing ${fname}`);
                    lines.forEach(([added, change]) => console.log(`${added ? `${consoleColor.green}+` : `${consoleColor.red}-`} ${change}${consoleColor.reset}`));
                }
            }
        } else {
            for (const [lang, files] of Object.entries(status.generatedResources)) {
                console.log(`  - ${lang}: ${files.length} resources generated`);
            }
            for (const [lang, files] of Object.entries(status.deleteResources)) {
                console.log(`  - ${lang}: ${files.length} resources deleted`);
            }
        }
    }
}
