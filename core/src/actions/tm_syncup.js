import { consoleLog, styleString } from '../l10nContext.js';

export class tm_syncup {
    static help = {
        description: 'pushes local TM to TM Stores.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--commit', 'commit making changes that are needed (dry-run by default)' ],
            [ '--delete', 'delete remote blocks with no jobs that exist in the local TM Store' ],
            [ '--neweronly', 'only sync up newer jobs' ],
            [ '--lang <sourceLang,targetLang>', 'source and target language pair' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    };

    static async action(monsterManager, options) {
        const dryrun = !options.commit;
        const newerOnly = Boolean(options.neweronly);
        const deleteEmptyBlocks = Boolean(options.delete);
        const tmStore = await monsterManager.tmm.getTmStore(options.tmStore);
        if (tmStore.access === 'readonly') {
            throw new Error(`TM Store ${tmStore.id} is read-only!`);
        }
        let sourceLang, targetLang;
        options.lang && ([ sourceLang, targetLang ] = options.lang.split(','));
        consoleLog`Syncing up ${tmStore.id} store...`;
        const syncUpStats = await monsterManager.tmm.syncUp(tmStore, {
            dryrun,
            sourceLang,
            targetLang,
            newerOnly,
            deleteEmptyBlocks,
            parallelism: options.parallelism,
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
        return { dryrun, newerOnly, deleteEmptyBlocks, syncUpStats };
    }
}
