import { tm_syncup } from './tm_syncup.js';
import { tm_syncdown } from './tm_syncdown.js';
import { tm_bootstrap } from './tm_bootstrap.js';
import { tm_list } from './tm_list.js';
import { tm_export } from './tm_export.js';
import { tm_cleanup } from './tm_cleanup.js';

/**
 * CLI action for various operations on translation memories.
 * @type {import('../../index.js').L10nAction}
 */
export const tm = {
    name: 'tm',
    help: {
        description: 'various operations on translation memories.',
    },
    subActions: [ tm_syncup, tm_syncdown, tm_bootstrap, tm_list, tm_export, tm_cleanup ],
};
