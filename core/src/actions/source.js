/* eslint-disable camelcase */
import { source_snap } from './sourceSnap.js';
import { source_list } from './sourceList.js';
import { source_untranslated } from './sourceUntranslated.js';

export class source {
    static help = {
        description: 'various operations on sources.',
    };

    static subActions = [ source_snap, source_list, source_untranslated ];
}
