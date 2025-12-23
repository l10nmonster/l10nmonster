import { consoleLog } from '../l10nContext.js';

/**
 * CLI action for showing information about local TM and TM Stores.
 * @type {import('../../index.js').L10nAction}
 */
export const tm_list = {
    name: 'tm_list',
    help: {
        description: 'show information about local TM and TM Stores.',
        arguments: [
            [ '[tmStore]', 'TM Store to list' ],
        ],
        options: [
            [ '--detailed', 'show more details' ],
            [ '--parallelism <number>', 'number of parallel operations' ],
        ],
    },

    async action(monsterManager, options) {
        let tmStoreIds;
        if (options.tmStore) {
            tmStoreIds = [ options.tmStore ];
        } else {
            tmStoreIds = monsterManager.tmm.tmStoreIds;
            // if no tm store is specified, list the local TM Cache as well
            const pairs = await monsterManager.tmm.getAvailableLangPairs();
            if (pairs.length === 0) {
                consoleLog`\nNothing in the local TM Cache`;
            } else {
                consoleLog`\nLocal TM Cache:`;
                if (options.detailed) {
                    const pctFormatter = new Intl.NumberFormat('en-US', {
                        style: 'percent',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    });
                    for (const [ srcLang, tgtLang ] of pairs) {
                        consoleLog`  ‣ ${srcLang} → ${tgtLang}`;
                        const tm = await monsterManager.tmm.getTM(srcLang, tgtLang);
                        const tmStats = await tm.getStats();
                        for (const stats of tmStats) {
                            consoleLog`      • ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} ${[stats.jobCount, 'job', 'jobs']}, ${stats.tuCount.toLocaleString()} ${[stats.tuCount, 'tu', 'tus']}, ${stats.distinctGuids.toLocaleString()} ${[stats.distinctGuids, 'guid', 'guids']} ${pctFormatter.format(stats.tuCount / stats.distinctGuids - 1)} redundancy`;
                        }
                    }
                } else {
                    consoleLog`  ‣ ${pairs.map(([ srcLang, tgtLang ]) => `${srcLang} → ${tgtLang}`).join(', ')}`;
                }
            }
        }
        if (tmStoreIds.length === 0) {
            consoleLog`\nNo TM Stores configured`;
        } else {
            consoleLog`\nTM Stores:`;
            for (const tmStoreId of tmStoreIds) {
                const tmStore = await monsterManager.tmm.getTmStore(/** @type {string} */ (tmStoreId));
                consoleLog`  ‣ ${tmStoreId}: ${tmStore.constructor.name} access: ${tmStore.access} partitioning: ${tmStore.partitioning}`;
                if (options.detailed) {
                    const tocs = await monsterManager.tmm.getTmStoreTOCs(tmStore, /** @type {number | undefined} */ (options.parallelism));
                    for (const [ srcLang, tgtLang, toc ] of tocs) {
                        const blocks = Object.values(toc.blocks);
                        const jobs = blocks.reduce((acc, block) => acc + block.jobs.length, 0);
                        consoleLog`      • ${srcLang} → ${tgtLang}: ${blocks.length.toLocaleString()} ${[blocks.length, 'block', 'blocks']} ${jobs.toLocaleString()} ${[jobs, 'job', 'jobs']}`;
                        // for (const block of blocks) {
                        //     consoleLog`        • ${block.blockName}. Jobs: ${block.jobs.map(e => e[0]).join(', ')}`;
                        // }
                    }
                }
            }
        }
    },
};
