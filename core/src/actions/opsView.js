import { writeFileSync } from 'fs';
import { consoleLog } from '@l10nmonster/core';
import { printRequest, printResponse } from './shared.js';

export class ops_view {
    static help = {
        description: 'view request/response/pairs of a job.',
        arguments: [
            [ '<jobGuid>', 'guid of job to view' ],
        ],
        options: [
            [ '--mode <viewOptions>', 'type of view', ['req', 'res', 'pairs'] ],
            [ '--outFile <filename>', 'write output to the specified file' ],
        ]
    };

    static async action(monsterManager, options) {
        const mode = options.mode ?? 'req';
        const jobGuid = options.jobGuid;
        const job = await monsterManager.tmm.getJob(jobGuid);
        if (job) {
            if (options.outFile) {
                writeFileSync(options.outFile, JSON.stringify(job, null, '\t'), 'utf8');
                consoleLog`\nJobs written to ${options.outFile}`;
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
    }
}
