import { consoleLog } from '../l10nContext.js';

export class tm_syncdown {
    static help = {
        description: 'synchronizes remote TM store to local TM cache.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--commit', 'commit making changes that are needed (dry-run by default)' ],
            [ '--delete', 'delete local jobs that do not exist in the remote TM Store' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    };

    static async action(monsterManager, options) {
        const dryrun = !options.commit;
        const deleteExtraJobs = Boolean(options.delete);
        const tmStore = await monsterManager.tmm.getTmStore(options.tmStore);
        if (tmStore.access === 'writeonly') {
            throw new Error(`TM Store ${tmStore.id} is write-only!`);
        }
        let sourceLang, targetLang;
        options.lang && ([ sourceLang, targetLang ] = options.lang.split(','));
        consoleLog`Syncing down ${tmStore.id} store...`;
        const syncDownStats = await monsterManager.tmm.syncDown(tmStore, {
            dryrun,
            sourceLang,
            targetLang,
            deleteExtraJobs,
            parallelism: options.parallelism,
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
                    consoleLog`  ‣ ${sourceLang} → ${targetLang}: ${jobsToDelete.length} local ${[jobsToDelete.length, 'job does', 'jobs do']} not exist in the remote TM Store. Use the --delete option to delete them.`;
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
    }
}
