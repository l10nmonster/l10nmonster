import { consoleLog } from '../l10nContext.js';

export class ops_delete {
    static help = {
        description: 'delete a job.',
        arguments: [
            [ '<jobGuid>', 'guid of job to delete' ],
        ],
    };

    static async action(monsterManager, options) {
        const jobGuidList = options.jobGuid.split(',');
        for (const jobGuid of jobGuidList) {
            try {
                consoleLog`Deleting job ${jobGuid}...`;
                await monsterManager.tmm.deleteJob(jobGuid);
            } catch (e) {
                e.message && (e.message = `Failed to delete job: ${e.message}`);
                throw e;
            }
        }
    }
}
