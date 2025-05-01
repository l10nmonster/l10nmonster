import { consoleLog } from '@l10nmonster/core';

export class ops_delete {
    static help = {
        description: 'delete a job.',
        arguments: [
            [ '<jobGuid>', 'guid of job to delete' ],
        ],
    };

    static async action(monsterManager, options) {
        const jobGuidList = options.jobGuid.split(',');
        jobGuidList.forEach(async jobGuid => {
            try {
                consoleLog`Deleting job ${jobGuid}...`;
                await monsterManager.tmm.deleteJob(jobGuid);
            } catch (e) {
                e.message && (e.message = `Failed to delete job: ${e.message}`);
                throw e;
            }
        });
    }
}
