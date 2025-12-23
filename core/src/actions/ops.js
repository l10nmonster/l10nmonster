import { ops_jobs } from './opsJobs.js';
import { ops_providers } from './opsProviders.js';
import { ops_view } from './opsView.js';
import { ops_update } from './opsUpdate.js';
import { ops_delete } from './opsDelete.js';

/**
 * CLI action for various operations on jobs.
 * @type {import('../../index.js').L10nAction}
 */
export const ops = {
    name: 'ops',
    help: {
        description: 'various operations on jobs.',
    },
    subActions: [ ops_jobs, ops_providers, ops_view, ops_update, ops_delete ],
};
