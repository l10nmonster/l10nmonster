import { consoleLog } from '@l10nmonster/core';

// eslint-disable-next-line camelcase
export class tm_list {
    static help = {
        description: 'show information about local TM and TM Stores.',
    };

    static async action(monsterManager) {
        const pairs = await monsterManager.tmm.getAvailableLangPairs();
        if (pairs.length === 0) {
            consoleLog`\nNothing in the local TM Cache`;
        } else {
            consoleLog`\nLocal TM Cache:`;
            for (const [ srcLang, tgtLang ] of pairs) {
                consoleLog`  ‣ ${srcLang} → ${tgtLang}`;
                const tm = await monsterManager.tmm.getTM(srcLang, tgtLang);
                const tmStats = tm.getStats();
                for (const stats of tmStats) {
                    consoleLog`      • ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} jobs, ${stats.tuCount.toLocaleString()} tus, ${stats.distinctGuids.toLocaleString()} guids`;
                }
            }
        }
        const tmStoreIds = monsterManager.getTmStoreIds();
        if (tmStoreIds.length === 0) {
            consoleLog`\nNo TM Stores configured`;
        } else {
            consoleLog`\nTM Stores:`;
            for (const tmStoreId of tmStoreIds) {
                const tmStore = await monsterManager.getTmStore(tmStoreId);
                consoleLog`  ‣ ${tmStoreId}: ${tmStore.constructor.name} access: ${tmStore.access} partitioning: ${tmStore.partitioning}`;
                const pairs = await tmStore.getAvailableLangPairs(tmStore);
                for (const [ srcLang, tgtLang ] of pairs) {
                    const toc = await tmStore.getTOC(srcLang, tgtLang);
                    const blocks = Object.values(toc.blocks);
                    const jobs = blocks.reduce((acc, block) => acc + block.jobs.length, 0);
                    consoleLog`      • ${srcLang} → ${tgtLang}: ${blocks.length.toLocaleString()} blocks ${jobs.toLocaleString()} jobs`;
                }
            }
        }
    }
}
