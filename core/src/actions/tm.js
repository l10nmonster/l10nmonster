import { tm_syncup } from './tm_syncup.js';
import { tm_syncdown } from './tm_syncdown.js';
import { tm_list } from './tm_list.js';
import { tm_export } from './tm_export.js';

export class tm {
    static help = {
        description: 'various operations on translation memories.',
    };

    static subActions = [ tm_syncup, tm_syncdown, tm_list, tm_export ];
}
