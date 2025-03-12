import { consoleLog } from '@l10nmonster/core';

export class pull {
    static help = {
        description: 'receive outstanding translation jobs.',
        options: [
            [ '--partial', 'commit partial deliveries' ],
            [ '-l, --lang <language>', 'only get jobs for the target language' ],
        ]
    };

    static async action(monsterManager, options) {
        const limitToLang = options.lang;
        const partial = options.partial;
        consoleLog`Pulling pending translations...`;
        const stats = await monsterManager.pull({ limitToLang, partial });
        consoleLog`Checked ${stats.numPendingJobs.toLocaleString()} pending jobs, ${stats.doneJobs.toLocaleString()} done jobs, ${stats.newPendingJobs.toLocaleString()} pending jobs created, ${stats.translatedStrings.toLocaleString()} translated strings found`;
    }
}
