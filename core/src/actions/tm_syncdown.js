import { consoleLog } from '../l10nContext.js';

// eslint-disable-next-line camelcase
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
        ],
    };

    static async action(monsterManager, options) {
        const dryrun = !options.commit;
        const response = { dryrun, syncDownStats: {} };
        consoleLog`Figuring out what needs to be synced down...`;
        const tmStore = await monsterManager.getTmStore(options.tmStore);
        const syncDownPair = async (srcLang, tgtLang) => {
            const syncDownStats = await monsterManager.tmm.prepareSyncDown(tmStore, srcLang, tgtLang);
            response.syncDownStats[srcLang] ??= {};
            response.syncDownStats[srcLang][tgtLang] = syncDownStats;
            if (syncDownStats.blocksToStore.length === 0 && syncDownStats.jobsToDelete.length === 0) {
                consoleLog`\nNothing to sync down from ${tmStore.id} store for ${srcLang} → ${tgtLang}`;
                return;
            } else {
                consoleLog`\nSyncing down ${srcLang} → ${tgtLang} from ${tmStore.id} store...`;
            }
            if (syncDownStats.blocksToStore.length > 0) {
                consoleLog`${syncDownStats.blocksToStore.length} ${[syncDownStats.blocksToStore.length, 'block', 'blocks']} to store: ${syncDownStats.blocksToStore.join(', ')}`;
            }
            if (syncDownStats.jobsToDelete.length > 0) {
                if (options.delete) {
                    consoleLog`${syncDownStats.jobsToDelete.length} ${[syncDownStats.jobsToDelete.length, 'job', 'jobs']} to delete locally: ${syncDownStats.jobsToDelete.join(', ')}`;
                } else {
                    consoleLog`${syncDownStats.jobsToDelete.length} local ${[syncDownStats.jobsToDelete.length, 'job does', 'jobs do']} not exist in the remote TM Store. Use --delete option to delete them.`;
                    syncDownStats.jobsToDelete = [];
                }
            }
            if (!dryrun) {
                await monsterManager.tmm.syncDown(tmStore, syncDownStats);
            }
        }
        if (options.lang) {
            const [ srcLang, tgtLang ] = options.lang.split(',');
            await syncDownPair(srcLang, tgtLang);
        } else {
            const pairs = await tmStore.getAvailableLangPairs();
            for (const [ srcLang, tgtLang ] of pairs) {
                await syncDownPair(srcLang, tgtLang);
            }
        }
        if (dryrun) {
            consoleLog`\nThis was just a dryrun, no changes were made!`;
        } else {
            consoleLog`\nDone!`;
        }
        return response;
    }
}
