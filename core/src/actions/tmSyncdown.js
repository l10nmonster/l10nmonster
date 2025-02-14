// eslint-disable-next-line camelcase
export class tm_syncdown {
    static help = {
        description: 'pulls remote TM store to local TM cache.',
        arguments: [
            [ '<tmStore>', 'name of the TM Store' ],
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
            !options.delete && (syncDownStats.jobsToDelete = []);
            if (syncDownStats.blocksToStore.length === 0 && syncDownStats.jobsToDelete.length === 0) {
                console.log(`Nothing to sync down from ${tmStore.name} store for ${srcLang} -> ${tgtLang}`);
                return;
            } else {
                console.log(`Syncing down ${srcLang} -> ${tgtLang} from ${tmStore.name} store...`);
            }
            if (syncDownStats.blocksToStore.length > 0) {
                console.log(`${syncDownStats.blocksToStore.length} blocks to store: ${syncDownStats.blocksToStore.join(', ')}`);
            }
            if (syncDownStats.jobsToDelete.length > 0) {
                console.log(`${syncDownStats.jobsToDelete.length} local jobs to delete: ${syncDownStats.jobsToDelete.join(', ')}`);
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
            console.log(`This was just a dryrun, no changes were made!`);
        }
    }
}
