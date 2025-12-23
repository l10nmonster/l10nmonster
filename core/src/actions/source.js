import { source_snap } from './sourceSnap.js';
import { source_list } from './sourceList.js';
import { source_untranslated } from './sourceUntranslated.js';
import { source_query } from './sourceQuery.js';
import { source_export } from './sourceExport.js';
import { source_import } from './sourceImport.js';

/**
 * CLI action for various operations on sources.
 * @type {import('../../index.js').L10nAction}
 */
export const source = {
    name: 'source',
    help: {
        description: 'various operations on sources.',
    },
    subActions: [ source_snap, source_list, source_untranslated, source_query, source_export, source_import ],
};
