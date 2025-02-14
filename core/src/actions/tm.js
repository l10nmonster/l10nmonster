/* eslint-disable camelcase */
import { tm_syncup } from './tmSyncup.js';
import { tm_syncdown } from './tmSyncdown.js';
import { tm_list } from './tmList.js';

export class tm {
    static help = {
        description: 'various operations on local TM Cache and TM Stores.',
    };

    static subActions = [ tm_syncup, tm_syncdown, tm_list ];
}
