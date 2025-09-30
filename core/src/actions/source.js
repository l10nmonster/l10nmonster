import { source_snap } from './sourceSnap.js';
import { source_list } from './sourceList.js';
import { source_untranslated } from './sourceUntranslated.js';
import { source_query } from './sourceQuery.js';
import { source_export } from './sourceExport.js';
import { source_import } from './sourceImport.js';

export class source {
    static help = {
        description: 'various operations on sources.',
    };

    static subActions = [ source_snap, source_list, source_untranslated, source_query, source_export, source_import ];
}
