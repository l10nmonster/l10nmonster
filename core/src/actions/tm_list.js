import { consoleLog } from '../l10nContext.js';

// eslint-disable-next-line camelcase
export class tm_list {
    static help = {
        description: 'show information about local TM and TM Stores.',
        arguments: [
            [ '[tmStore]', 'TM Store to list' ],
        ],
        options: [
            [ '--detailed', 'show more details' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    };

    static async action(monsterManager, options) {
        let tmStoreIds;
        if (options.tmStore) {
            tmStoreIds = [ options.tmStore ];
        } else {
            tmStoreIds = monsterManager.tmm.getTmStoreIds();
            // if no tm store is specified, list the local TM Cache as well
            const pairs = await monsterManager.tmm.getAvailableLangPairs();
            if (pairs.length === 0) {
                consoleLog`\nNothing in the local TM Cache`;
            } else {
                consoleLog`\nLocal TM Cache:`;
                const pctFormatter = new Intl.NumberFormat('en-US', {
                    style: 'percent',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                });
                for (const [ srcLang, tgtLang ] of pairs) {
                    consoleLog`  ‣ ${srcLang} → ${tgtLang}`;
                    const tm = await monsterManager.tmm.getTM(srcLang, tgtLang);
                    const tmStats = tm.getStats();
                    for (const stats of tmStats) {
                        consoleLog`      • ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} ${[stats.jobCount, 'job', 'jobs']}, ${stats.tuCount.toLocaleString()} ${[stats.tuCount, 'tu', 'tus']}, ${stats.distinctGuids.toLocaleString()} ${[stats.distinctGuids, 'guid', 'guids']} ${pctFormatter.format(stats.tuCount / stats.distinctGuids - 1)} redundancy`;
                    }
                }
            }
        }
        if (tmStoreIds.length === 0) {
            consoleLog`\nNo TM Stores configured`;
        } else {
            consoleLog`\nTM Stores:`;
            for (const tmStoreId of tmStoreIds) {
                const tmStore = await monsterManager.tmm.getTmStore(tmStoreId);
                consoleLog`  ‣ ${tmStoreId}: ${tmStore.constructor.name} access: ${tmStore.access} partitioning: ${tmStore.partitioning}`;
                const tocs = await monsterManager.tmm.getTmStoreTOCs(tmStore, options.parallelism);
                for (const [ srcLang, tgtLang, toc ] of tocs) {
                    const blocks = Object.values(toc.blocks);
                    const jobs = blocks.reduce((acc, block) => acc + block.jobs.length, 0);
                    consoleLog`      • ${srcLang} → ${tgtLang}: ${blocks.length.toLocaleString()} ${[blocks.length, 'block', 'blocks']} ${jobs.toLocaleString()} ${[jobs, 'job', 'jobs']}`;
                    if (options.detailed) {
                        for (const block of blocks) {
                            consoleLog`        • ${block.blockName}. Jobs: ${block.jobs.map(e => e[0]).join(', ')}`;
                        }
                    }
                }
            }
        }
    }
}
