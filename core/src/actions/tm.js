/* eslint-disable camelcase */
import { tm_syncup } from './tmSyncup.js';
import { tm_syncdown } from './tmSyncdown.js';
import { tm_list } from './tmList.js';
import { tm_export } from './tmExport.js';

export class tm {
    static help = {
        description: 'various operations on translation memories.',
    };

    static subActions = [ tm_syncup, tm_syncdown, tm_list, tm_export ];
}
