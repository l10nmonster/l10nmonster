import { jobPushCmd } from '../commands/job.js';
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
            const req = await monsterManager.jobStore.getJobRequest(jobGuid);
            if (req) {
                console.log(`Showing request of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang}`);
                printRequest(req);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (op === 'res') {
            const req = await monsterManager.jobStore.getJobRequest(jobGuid);
            const res = await monsterManager.jobStore.getJob(jobGuid);
            if (req && res) {
                console.log(`Showing response of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
                printResponse(req, res);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (op === 'pairs') {
            const req = await monsterManager.jobStore.getJobRequest(jobGuid);
            const res = await monsterManager.jobStore.getJob(jobGuid);
            if (req && res) {
                console.log(`Showing source-target pairs of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
                printResponse(req, res, true);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (op === 'push') {
            console.log(`Pushing job ${jobGuid}...`);
            try {
                const pushResponse = await jobPushCmd(monsterManager, jobGuid);
                console.log(`${pushResponse.num.toLocaleString()} translations units requested -> status: ${pushResponse.status}`);
            } catch (e) {
                console.error(`Failed to push job: ${e.stack ?? e}`);
            }
        } else if (op === 'delete') {
            console.log(`Deleting job ${jobGuid}...`);
            try {
                const res = await monsterManager.jobStore.getJob(jobGuid);
                if (res) {
                    console.error(`Can only delete blocked/failed jobs. This job has status: ${res.status}`);
                } else {
                    await monsterManager.jobStore.deleteJobRequest(jobGuid);
                }
            } catch (e) {
                console.error(`Failed to push job: ${e.stack ?? e}`);
            }
        } else {
            console.error(`Invalid operation: ${op}`);
        }
    }
}
