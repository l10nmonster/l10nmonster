import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} OpsJobsOptions
 * @property {string} [listMode] - Selection mode ('unfinished' or 'recent')
 * @property {string} [lang] - Language pair (srcLang,tgtLang)
 * @property {string | number} [limit] - Maximum number of jobs
 * @property {string} [since] - Date filter
 */

/**
 * CLI action for listing translation jobs.
 * @type {import('../../index.js').L10nAction}
 */
export const ops_jobs = {
    name: 'ops_jobs',
    help: {
        description: 'list translation jobs.',
        arguments: [
            [ '[listMode]', 'selection of jobs to list', ['unfinished', 'recent'] ],
        ],
        options: [
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--limit <entries>', 'maximum number of jobs showed' ],
            [ '--since <date>', 'only list jobs updated since date' ],
        ]
    },

    async action(mm, options) {
        const opts = /** @type {OpsJobsOptions} */ (options);
        const listMode = opts.listMode ?? 'unfinished';
        const limit = Number(opts.limit ?? 10);
        const since = new Date(opts.since ?? '1970-01-01');
        const langPairs = opts.lang ? [ opts.lang.split(',') ] : (await mm.tmm.getAvailableLangPairs()).sort();
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
                    const jobUpdatedAt = new Date(job.updatedAt);
                    if ((job.status !== 'done' || listMode === 'recent') && jobUpdatedAt >= since) {
                        selectedJobs.push({ ...job, updatedAt: jobUpdatedAt });
                        count++;
                    }
                    if (count >= limit) {
                        break;
                    }
                }
                if (selectedJobs.length > 0) {
                    consoleLog`  ‣ ${sourceLang} → ${targetLang} (${allJobs.length} total ${[allJobs.length, 'job', 'jobs']})`;
                    for (const { jobGuid, status, translationProvider, updatedAt } of selectedJobs) {
                        consoleLog`      • ${dateFormatter.format(updatedAt)} jobGuid: ${jobGuid} status: ${status} provider: ${translationProvider}`;
                    }
                }
            }
        }
    },
};
//