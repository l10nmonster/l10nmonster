import { consoleLog } from '@l10nmonster/core';

export class ops_delete {
    static help = {
        description: 'delete a job.',
        arguments: [
            [ '<jobGuid>', 'guid of job to delete' ],
        ],
    };

    static async action(monsterManager, options) {
        const jobGuid = options.jobGuid;
        consoleLog`Deleting job ${jobGuid}...`;
        try {
            await monsterManager.tmm.deleteJob(jobGuid);
        } catch (e) {
            console.error(`Failed to delete job: ${e.message ?? e}`);
        }
    }
}
