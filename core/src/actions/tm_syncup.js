import { consoleLog, styleString } from '../l10nContext.js';

// eslint-disable-next-line camelcase
export class tm_syncup {
    static help = {
        description: 'pushes local TM to TM Stores.',
        arguments: [
            [ '<tmStore>', 'id of the TM Store' ],
        ],
        options: [
            [ '--commit', 'commit making changes that are needed (dry-run by default)' ],
            [ '--neweronly', 'only sync up newer jobs' ],
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
    };

    static async action(monsterManager, options) {
        const dryrun = !options.commit;
        const response = { dryrun, syncUpStats: {} };
        consoleLog`Figuring out what needs to be synced up...`;
        const tmStore = await monsterManager.getTmStore(options.tmStore);
        if (tmStore.access === 'readonly') {
            throw new Error(`TM Store ${tmStore.id} is read-only!`);
        }
        const syncUpPair = async (srcLang, tgtLang) => {
            const syncUpStats = await monsterManager.tmm.prepareSyncUp(tmStore, srcLang, tgtLang, {
                newerOnly: Boolean(options.neweronly),
            });
            response.syncUpStats[srcLang] ??= {};
            response.syncUpStats[srcLang][tgtLang] = syncUpStats;
            if (syncUpStats.blocksToUpdate.length === 0 && syncUpStats.jobsToUpdate.length === 0) {
                consoleLog`\nNothing to sync up with ${tmStore.id} store for ${srcLang} → ${tgtLang}`;
                return;
            } else {
                consoleLog`\nSyncing up ${srcLang} → ${tgtLang} to ${tmStore.id} store...`;
            }
            if (syncUpStats.blocksToUpdate.length > 0) {
                consoleLog`${syncUpStats.blocksToUpdate.length} ${[syncUpStats.blocksToUpdate.length, 'block', 'blocks']} to update: ${syncUpStats.blocksToUpdate.map(([ blockId, jobs ]) => styleString`${blockId} (${jobs.length.toLocaleString()} ${[jobs.length, 'job', 'jobs']})`).join(', ')}`;
            }
            if (syncUpStats.jobsToUpdate.length > 0) {
                consoleLog`${syncUpStats.jobsToUpdate.length} ${[syncUpStats.jobsToUpdate.length, 'job', 'jobs']} to update: ${syncUpStats.jobsToUpdate.join(', ')}`;
            }
            if (!dryrun) {
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
        if (dryrun) {
            consoleLog`\nThis was just a dryrun, no changes were made!`;
        } else {
            consoleLog`\nDone!`;
        }
        return response;
    }
}
