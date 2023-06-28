import { tmExportCmd } from '@l10nmonster/core';
import { consoleColor } from './shared.js';

export class tmexport {
    static help = {
        description: 'export translation memory in various formats.',
        arguments: [
            [ '<mode>', 'export source (including untranslated) or tm entries (including missing in source)', ['source', 'tm'] ],
            [ '<format>', 'exported file format', ['tmx', 'json', 'job'] ],
        ],
        options: [
            [ '-l, --lang <language>', 'target language to export' ],
            [ '--prjsplit', 'split target files by project' ],
        ]
    };

    static async action(monsterManager, options) {
        const format = options.format;
        const mode = options.mode;
        const limitToLang = options.lang;
        const prjsplit = options.prjsplit;
        if (['job', 'json', 'tmx'].includes(format)) {
            if (['source', 'tm'].includes(mode)) {
                console.log(`Exporting TM in mode ${consoleColor.bright}${mode}${consoleColor.reset} and format ${consoleColor.bright}${format}${consoleColor.reset} for ${consoleColor.bright}${limitToLang ? limitToLang : 'all languages'}${consoleColor.reset}...`);
                const status = await tmExportCmd(monsterManager, { limitToLang, mode, format, prjsplit });
                console.log(`Generated files: ${status.files.join(', ')}`);
            } else {
                console.error('Invalid mode');
            }
        } else {
            console.error('Invalid export format');
        }
    }
}
