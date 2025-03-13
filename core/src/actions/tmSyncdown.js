import { consoleLog } from '@l10nmonster/core';

// eslint-disable-next-line camelcase
export class tm_syncdown {
    static help = {
        description: 'pulls remote TM store to local TM cache.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--dryrun', 'only preview changes that are needed' ],
            [ '--delete', 'delete local jobs that do not exist in the remote TM Store' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
    };

    static async action(monsterManager, options) {
        const tmStore = await monsterManager.getTmStore(options.tmStore);
        const syncDownPair = async (srcLang, tgtLang) => {
            const syncDownStats = await monsterManager.tmm.prepareSyncDown(tmStore, srcLang, tgtLang);
            if (syncDownStats.blocksToStore.length === 0 && syncDownStats.jobsToDelete.length === 0) {
                consoleLog`Nothing to sync down from ${tmStore.id} store for ${srcLang} -> ${tgtLang}`;
                return;
            } else {
                consoleLog`Syncing down ${srcLang} -> ${tgtLang} from ${tmStore.id} store...`;
            }
            if (syncDownStats.blocksToStore.length > 0) {
                consoleLog`${syncDownStats.blocksToStore.length} blocks to store: ${syncDownStats.blocksToStore.join(', ')}`;
            }
            if (syncDownStats.jobsToDelete.length > 0) {
                if (options.delete) {
                    consoleLog`${syncDownStats.jobsToDelete.length} local jobs to delete: ${syncDownStats.jobsToDelete.join(', ')}`;
                } else {
                    consoleLog`${syncDownStats.jobsToDelete.length} local jobs do not exist in the remote TM Store. Use --delete option to delete them.`;
                    syncDownStats.jobsToDelete = [];
                }
            }
            if (!options.dryrun) {
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
        if (options.dryrun) {
            consoleLog`This was just a dryrun, no changes were made!`;
        }
    }
}
