import { consoleLog, styleString } from '../l10nContext.js';

/**
 * @typedef {Object} TmSyncupOptions
 * @property {string} tmStore - TM store ID
 * @property {boolean} [commit] - Commit changes
 * @property {boolean} [delete] - Delete empty blocks
 * @property {boolean} [excludeUnassigned] - Exclude unassigned
 * @property {string} [storeAlias] - Store alias
 * @property {string} [lang] - Language pair
 * @property {number} [parallelism] - Parallel operations
 */

/**
 * CLI action for pushing local TM to TM Stores.
 * @type {import('../../index.js').L10nAction}
 */
export const tm_syncup = {
    name: 'tm_syncup',
    help: {
        description: 'pushes local TM to TM Stores.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--commit', 'commit making changes that are needed (dry-run by default)' ],
            [ '--delete', 'delete remote blocks with no jobs that exist in the local TM Store' ],
            [ '--excludeUnassigned', 'exclude unassigned jobs from the sync up' ],
            [ '--storeAlias <id>', 'alias of the TM Store to sync up' ],
            [ '--lang <sourceLang,targetLang>', 'source and target language pair' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    },

    async action(monsterManager, options) {
        const opts = /** @type {TmSyncupOptions} */ (options);
        const dryrun = !opts.commit;
        const includeUnassigned = !opts.excludeUnassigned;
        const deleteEmptyBlocks = Boolean(opts.delete);
        const tmStore = await monsterManager.tmm.getTmStore(opts.tmStore);
        if (tmStore.access === 'readonly') {
            throw new Error(`TM Store ${tmStore.id} is read-only!`);
        }
        let sourceLang, targetLang;
        opts.lang && ([ sourceLang, targetLang ] = opts.lang.split(','));
        consoleLog`Syncing up ${tmStore.id} store...`;
        const syncUpStats = await monsterManager.tmm.syncUp(tmStore, {
            dryrun,
            sourceLang,
            targetLang,
            deleteEmptyBlocks,
            includeUnassigned,
            assignUnassigned: true,
            storeAlias: opts.storeAlias,
            parallelism: opts.parallelism,
        });
        let changes = false;
        for (const { sourceLang, targetLang, blocksToUpdate, jobsToUpdate } of syncUpStats) {
            if (blocksToUpdate.length > 0) {
                changes = true;
                consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${blocksToUpdate.length} ${[blocksToUpdate.length, 'block', 'blocks']} updated: ${blocksToUpdate.map(([ blockId, jobs ]) => styleString`${blockId} (${jobs.length.toLocaleString()} ${[jobs.length, 'job', 'jobs']})`).join(', ')}`;
            }
            if (jobsToUpdate.length > 0) {
                changes = true;
                consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${jobsToUpdate.length} ${[jobsToUpdate.length, 'job', 'jobs']} updated: ${jobsToUpdate.join(', ')}`;
            }
        }
        if (changes) {
            if (dryrun) {
                consoleLog`\nThis was just a dryrun, no changes were made!`;
            } else {
                consoleLog`\nDone!`;
            }
        } else {
            consoleLog`Nothing to sync up with ${tmStore.id} store!`;
        }
        return { dryrun, deleteEmptyBlocks, syncUpStats };
    },
};
