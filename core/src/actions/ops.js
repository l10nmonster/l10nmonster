import { ops_list } from './opsList.js';
import { ops_view } from './opsView.js';
import { ops_update } from './opsUpdate.js';
import { ops_delete } from './opsDelete.js';

export class ops {
    static help = {
        description: 'various operations on jobs.',
        // options: [
        //     [ '-l, --lang <language>', 'only get jobs for the target language' ],
        // ]
    };

    static subActions = [ ops_list, ops_view, ops_update, ops_delete ];
}
