import { writeFileSync } from 'fs';
import { consoleLog } from '../l10nContext.js';
import { printRequest, printResponse } from './shared.js';

/**
 * @typedef {Object} OpsViewOptions
 * @property {string} jobGuid - Job GUID to view
 * @property {'req' | 'res' | 'pairs'} [mode] - View type
 * @property {string} [outFile] - Output file path
 */

/**
 * CLI action for viewing job request/response/pairs.
 * @type {import('../../index.js').L10nAction}
 */
export const ops_view = {
    name: 'ops_view',
    help: {
        description: 'view request/response/pairs of a job.',
        arguments: [
            [ '<jobGuid>', 'guid of job to view' ],
        ],
        options: [
            [ '--mode <viewOptions>', 'type of view', ['req', 'res', 'pairs'] ],
            [ '--outFile <filename>', 'write output to the specified file' ],
        ]
    },

    async action(monsterManager, options) {
        const opts = /** @type {OpsViewOptions} */ (options);
        const mode = opts.mode ?? 'req';
        const jobGuid = opts.jobGuid;
        const job = await monsterManager.tmm.getJob(jobGuid);
        if (job) {
            if (opts.outFile) {
                writeFileSync(opts.outFile, JSON.stringify(job, null, '\t'), 'utf8');
                consoleLog`\nJobs written to ${opts.outFile}`;
            } else {
                if (mode === 'req') {
                    consoleLog`Showing request of job ${jobGuid} ${job.sourceLang} → ${job.targetLang}`;
                    printRequest(job);
                } else if (mode === 'res') {
                    consoleLog`Showing response of job ${jobGuid} ${job.sourceLang} → ${job.targetLang} (${job.translationProvider}) ${job.status}`;
                    printResponse(job);
                } else if (mode === 'pairs') {
                    consoleLog`Showing source-target pairs of job ${jobGuid} ${job.sourceLang} → ${job.targetLang} (${job.translationProvider}) ${job.status}`;
                    printResponse(job, true);
                }
            }
        } else {
            consoleLog`Could not fetch the specified job`;
        }
    },
};
