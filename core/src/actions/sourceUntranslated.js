import { consoleLog } from '@l10nmonster/core';

export class source_untranslated {
    static help = {
        description: 'identifies untranslated source content.',
        options: [
        ]
    };

    static async action(mm) {
        consoleLog`Untranslated source content for all language pairs`;
        const jobs = [];
        const langPairs = await mm.rm.getAvailableLangPairs();
        for (const [ sourceLang, targetLang ] of langPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const segments = tm.getUntranslatedContent();
            if (segments.length === 0) {
                consoleLog`  ‣ ${sourceLang} -> ${targetLang}: fully translated`;
            } else {
                consoleLog`  ‣ ${sourceLang} -> ${targetLang}: ${segments.length} segments`;
                jobs.push({ sourceLang, targetLang, segments });
            }
        }
    }
}
