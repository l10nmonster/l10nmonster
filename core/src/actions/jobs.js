import { jobsCmd } from '../commands/jobs.js';
import { consoleColor } from './shared.js';

export class jobs {
    static help = {
        description: 'unfinished jobs status.',
        options: [
            [ '-l, --lang <language>', 'only get jobs for the target language' ],
        ]
    };

    static async action(monsterManager, options) {
        const limitToLang = options.lang;
        const jobs = await jobsCmd(monsterManager, { limitToLang });
        for (const [lang, jobManifests] of Object.entries(jobs)) {
            if (jobManifests.length > 0) {
                console.log(`Target language ${consoleColor.bright}${lang}${consoleColor.reset}:`);
                for (const mf of jobManifests) {
                    const numUnits = mf.inflight?.length ?? mf.tus?.length ?? 0;
                    const lastModified = new Date(mf.updatedAt);
                    console.log(`  Job ${mf.jobGuid}: status ${consoleColor.bright}${mf.status}${consoleColor.reset} ${numUnits.toLocaleString()} ${mf.sourceLang} units with ${mf.translationProvider} - ${lastModified.toDateString()} ${lastModified.toLocaleTimeString()}`);
                }
            }
        }
    }
}
