import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} OpsDeleteOptions
 * @property {string} jobGuid - Job GUID(s) to delete (comma-separated)
 */

/**
 * CLI action for deleting a job.
 * @type {import('../../index.js').L10nAction}
 */
export const ops_delete = {
    name: 'ops_delete',
    help: {
        description: 'delete a job.',
        arguments: [
            [ '<jobGuid>', 'guid of job to delete' ],
        ],
    },

    async action(monsterManager, options) {
        const opts = /** @type {OpsDeleteOptions} */ (options);
        const jobGuidList = opts.jobGuid.split(',');
        for (const jobGuid of jobGuidList) {
            try {
                consoleLog`Deleting job ${jobGuid}...`;
                await monsterManager.tmm.deleteJob(jobGuid);
            } catch (e) {
                e.message && (e.message = `Failed to delete job: ${e.message}`);
                throw e;
            }
        }
    },
};
