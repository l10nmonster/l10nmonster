import { consoleLog } from '../l10nContext.js';

/**
 * @typedef {Object} TmSyncdownOptions
 * @property {string} tmStore - TM store ID
 * @property {boolean} [commit] - Commit changes
 * @property {boolean} [delete] - Delete extra jobs
 * @property {boolean} [import] - Treat as unassigned
 * @property {string} [storeAlias] - Store alias
 * @property {string} [lang] - Language pair
 * @property {number} [parallelism] - Parallel operations
 */

/**
 * CLI action for syncing remote TM store to local TM cache.
 * @type {import('../../index.js').L10nAction}
 */
export const tm_syncdown = {
    name: 'tm_syncdown',
    help: {
        description: 'synchronizes remote TM store to local TM cache.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--commit', 'commit making changes that are needed (dry-run by default)' ],
            [ '--delete', 'delete local jobs that do not exist in the remote TM Store' ],
            [ '--import', 'treat jobs as unassigned (do not sync them back up to the same TM Store)' ],
            [ '--storeAlias <id>', 'alias of the TM Store to sync down' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    },

    async action(monsterManager, options) {
        const opts = /** @type {TmSyncdownOptions} */ (options);
        const dryrun = !opts.commit;
        const deleteExtraJobs = Boolean(opts.delete);
        const eraseParentTmStore = Boolean(opts.import);
        const tmStore = await monsterManager.tmm.getTmStore(opts.tmStore);
        if (tmStore.access === 'writeonly') {
            throw new Error(`TM Store ${tmStore.id} is write-only!`);
        }
        let sourceLang, targetLang;
        opts.lang && ([ sourceLang, targetLang ] = opts.lang.split(','));
        consoleLog`Syncing down ${tmStore.id} store...`;
        const syncDownStats = await monsterManager.tmm.syncDown(tmStore, {
            dryrun,
            sourceLang,
            targetLang,
            deleteExtraJobs,
            eraseParentTmStore,
            storeAlias: opts.storeAlias,
            parallelism: opts.parallelism,
        });
        let changes = false;
        for (const { sourceLang, targetLang, blocksToStore, jobsToDelete } of syncDownStats) {
            if (blocksToStore.length > 0) {
                changes = true;
                consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${blocksToStore.length} ${[blocksToStore.length, 'block', 'blocks']} stored: ${blocksToStore.join(', ')}`;
            }
            if (jobsToDelete.length > 0) {
                changes = true;
                if (deleteExtraJobs) {
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${jobsToDelete.length} ${[jobsToDelete.length, 'job', 'jobs']} deleted locally: ${jobsToDelete.join(', ')}`;
                } else {
                    // consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${jobsToDelete.length} local ${[jobsToDelete.length, 'job does', 'jobs do']} not exist in the remote TM Store. Use the --delete option to delete them.`;
                }
            }
        }
        if (changes) {
            if (dryrun) {
                consoleLog`\nThis was just a dryrun, no changes were made!`;
            } else {
                consoleLog`\nDone!`;
            }
        } else {
            consoleLog`Nothing to sync down with ${tmStore.id} store!`;
        }
        return { dryrun, deleteExtraJobs, syncDownStats };
    },
};
