import { consoleLog } from '@l10nmonster/core';

// eslint-disable-next-line camelcase
export class tm_syncup {
    static help = {
        description: 'pushes local TM to TM Stores.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--dryrun', 'only preview changes that are needed' ],
            [ '--neweronly', 'only sync up newer jobs' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
    };

    static async action(monsterManager, options) {
        consoleLog`Figuring out what needs to be synced up...`;
        const tmStore = await monsterManager.getTmStore(options.tmStore);
        const syncUpPair = async (srcLang, tgtLang) => {
            const syncUpStats = await monsterManager.tmm.prepareSyncUp(tmStore, srcLang, tgtLang, {
                newerOnly: Boolean(options.neweronly),
            });
            if (syncUpStats.blocksToUpdate.length === 0 && syncUpStats.jobsToUpdate.length === 0) {
                consoleLog`Nothing to sync up with ${tmStore.id} store for ${srcLang} -> ${tgtLang}`;
                return;
            } else {
                consoleLog`Syncing up ${srcLang} -> ${tgtLang} to ${tmStore.id} store...`;
            }
            if (syncUpStats.blocksToUpdate.length > 0) {
                consoleLog`${syncUpStats.blocksToUpdate.length} ${[syncUpStats.blocksToUpdate.length, 'block', 'blocks']} to update:`;
                syncUpStats.blocksToUpdate.forEach(([ block, modifiedStore, modifiedCache ]) => consoleLog`  ${block} (modified: ${modifiedStore} vs ${modifiedCache})`);
            }
            if (syncUpStats.jobsToUpdate.length > 0) {
                consoleLog`${syncUpStats.jobsToUpdate.length} ${[syncUpStats.jobsToUpdate.length, 'job', 'jobs']} to store:`;
                consoleLog`  ${syncUpStats.jobsToUpdate.join(', ')}`;
            }
            if (!options.dryrun) {
                await monsterManager.tmm.syncUp(tmStore, syncUpStats);
            }
        }
        if (options.lang) {
            const [ srcLang, tgtLang ] = options.lang.split(',');
            await syncUpPair(srcLang, tgtLang);
        } else {
            const pairs = await monsterManager.tmm.getAvailableLangPairs();
            for (const [ srcLang, tgtLang ] of pairs) {
                await syncUpPair(srcLang, tgtLang);
            }
        }
        if (options.dryrun) {
            consoleLog`This was just a dryrun, no changes were made!`;
        }
}
}
