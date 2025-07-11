import { consoleLog } from '../l10nContext.js';

export class ops_jobs {
    static help = {
        description: 'list translation jobs.',
        arguments: [
            [ '[listMode]', 'selection of jobs to list', ['unfinished', 'recent'] ],
        ],
        options: [
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--limit <entries>', 'maximum number of jobs showed' ],
            [ '--since <date>', 'only list jobs updated since date' ],
        ]
    };

    static async action(mm, options) {
        const listMode = options.listMode ?? 'unfinished';
        const limit = Number(options.limit ?? 10);
        const since = new Date(options.since ?? '1970-01-01');
        const langPairs = options.lang ? [ options.lang.split(',') ] : (await mm.tmm.getAvailableLangPairs()).sort();
        if (langPairs.length === 0) {
            consoleLog`There are no jobs in the local TM Cache`;
        } else {
            const dateFormatter = new Intl.DateTimeFormat('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
            consoleLog`${listMode} translation jobs: (${langPairs.length} ${[langPairs.length, 'pair', 'pairs']})`;
            for (const [ sourceLang, targetLang ] of langPairs) {
                const allJobs = await mm.tmm.getJobTOCByLangPair(sourceLang, targetLang);
                const selectedJobs = [];
                let count = 0;
                for (const job of allJobs) {
                    job.updatedAt = new Date(job.updatedAt);
                    if ((job.status !== 'done' || listMode === 'recent') && job.updatedAt >= since) {
                        selectedJobs.push(job);
                        count++;
                    }
                    if (count >= limit) {
                        break;
                    }
                }
                if (Object.keys(selectedJobs).length > 0) {
                    consoleLog`  ‣ ${sourceLang} → ${targetLang} (${allJobs.length} total ${[allJobs.length, 'job', 'jobs']})`;
                    for (const { jobGuid, status, translationProvider, updatedAt } of selectedJobs) {
                        consoleLog`      • ${dateFormatter.format(updatedAt)} jobGuid: ${jobGuid} status: ${status} provider: ${translationProvider}`;
                    }
                }
            }
        }
    }
}
//