import { printRequest, printResponse } from './shared.js';

export class job {
    static help = {
        description: 'show request/response/pairs of a job or push/delete jobs.',
        arguments: [
            [ '<operation>', 'operation to perform on job', ['req', 'res', 'pairs', 'push', 'delete'] ],
        ],
        requiredOptions: [
            [ '-g, --jobGuid <guid>', 'guid of job' ],
        ]
    };

    static async action(monsterManager, options) {
        const op = options.operation;
        const jobGuid = options.jobGuid;
        if (op === 'req') {
            const job = await monsterManager.tmm.getJob(jobGuid);
            if (job) {
                console.log(`Showing request of job ${jobGuid} ${job.sourceLang} -> ${job.targetLang}`);
                printRequest(job);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (op === 'res') {
            const job = await monsterManager.tmm.getJob(jobGuid);
            if (job) {
                console.log(`Showing response of job ${jobGuid} ${job.sourceLang} -> ${job.targetLang} (${job.translationProvider}) ${job.status}`);
                printResponse(job);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (op === 'pairs') {
            const job = await monsterManager.tmm.getJob(jobGuid);
            if (job) {
                console.log(`Showing source-target pairs of job ${jobGuid} ${job.sourceLang} -> ${job.targetLang} (${job.translationProvider}) ${job.status}`);
                printResponse(job, true);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (op === 'push') {
            console.log(`Pushing job ${jobGuid}...`);
            try {
                const pushResponse = await monsterManager.jobPush(jobGuid);
                console.log(`${pushResponse.num.toLocaleString()} translations units requested -> status: ${pushResponse.status}`);
            } catch (e) {
                console.error(`Failed to push job: ${e.stack ?? e}`);
            }
        } else if (op === 'delete') {
            console.log(`Deleting job ${jobGuid}...`);
            try {
                await monsterManager.tmm.deleteJobRequest(jobGuid);
            } catch (e) {
                console.error(`Failed to delete job: ${e.stack ?? e}`);
            }
        } else {
            console.error(`Invalid operation: ${op}`);
        }
    }
}
