import { consoleLog } from '@l10nmonster/core';

export class jobs {
    static help = {
        description: 'unfinished jobs status.',
        options: [
            [ '-l, --lang <language>', 'only get jobs for the target language' ],
        ]
    };

    static async action(monsterManager, options) {
        const limitToLang = options.lang;
        const jobs = await monsterManager.jobs({ limitToLang });
        for (const [lang, jobManifests] of Object.entries(jobs)) {
            if (jobManifests.length > 0) {
                consoleLog`Target language ${lang}$:`;
                for (const mf of jobManifests) {
                    const numUnits = mf.inflight?.length ?? mf.tus?.length ?? 0;
                    const lastModified = new Date(mf.updatedAt);
                    consoleLog`  Job ${mf.jobGuid}: status ${mf.status}$ ${numUnits.toLocaleString()} ${mf.sourceLang} units with ${mf.translationProvider} - ${lastModified.toDateString()} ${lastModified.toLocaleTimeString()}`;
                }
            }
        }
    }
}
