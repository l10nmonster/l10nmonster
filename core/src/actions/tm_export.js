import { consoleLog } from '../l10nContext.js';
import { FsJsonlTmStore } from '../helpers/stores/fsTmStores.js';

/**
 * @typedef {Object} TmExportOptions
 * @property {string} jobsDir - Directory to export to
 * @property {'job' | 'provider' | 'language'} [partitioning] - Partitioning mode
 * @property {string} [lang] - Language pair (srcLang,tgtLang)
 * @property {string} [storeAlias] - TM store alias
 */

/**
 * CLI action for exporting jobs to jsonl files.
 * @type {import('../../index.js').L10nAction}
 */
export const tm_export = {
    name: 'tm_export',
    help: {
        description: 'exports jobs to jsonl files.',
        arguments: [
            [ '<jobsDir>', 'directory to export jobs to' ],
        ],
        options: [
            [ '--partitioning <mode>', 'one file per job, provider, or language', [ 'job', 'provider', 'language' ] ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--storeAlias <id>', 'alias of the TM Store to export' ],
        ],
    },

    async action(monsterManager, options) {
        const opts = /** @type {TmExportOptions} */ (options);
        let sourceLang, targetLang;
        opts.lang && ([ sourceLang, targetLang ] = opts.lang.split(','));
        const tmStore = new FsJsonlTmStore({
            id: 'tmexport',
            jobsDir: opts.jobsDir,
            partitioning: opts.partitioning ?? 'language',
        });
        const syncUpStats = await monsterManager.tmm.syncUp(tmStore, {
            dryrun: false,
            includeUnassigned: true,
            assignUnassigned: false,
            storeAlias: opts.storeAlias,
            sourceLang,
            targetLang,
        });
        consoleLog`\nExport done`;
        for (const { sourceLang, targetLang, jobsToUpdate } of syncUpStats) {
            consoleLog`  ‣ ${sourceLang} → ${targetLang} ${jobsToUpdate.length} ${[jobsToUpdate.length, 'job', 'jobs']} exported`;
        }
    },
};
