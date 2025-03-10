// eslint-disable-next-line camelcase
export class tm_list {
    static help = {
        description: 'show information about local TM and TM Stores.',
        // arguments: [
        //     [ '[tmStore]', 'id of the TM Store to deep dive into' ],
        // ],
    };

    static async action(monsterManager) {
        // const tmStore = await monsterManager.getTmStore(options.tmStore);
        console.log(`Local TM Cache:`);
        const pairs = await monsterManager.tmm.getAvailableLangPairs();
        for (const [ srcLang, tgtLang ] of pairs) {
            console.log(`  ${srcLang}/${tgtLang}:`);
            const tm = await monsterManager.tmm.getTM(srcLang, tgtLang);
            const tmStats = tm.getStats();
            for (const stats of tmStats) {
                console.log(`      * ${stats.translationProvider}(${stats.status}): ${stats.jobCount.toLocaleString()} jobs, ${stats.tuCount.toLocaleString()} tus, ${stats.distinctGuids.toLocaleString()} guids`);
            }
        }
        const tmStoreIds = monsterManager.getTmStoreIds();
        console.log(`TM Stores:`);
        for (const tmStoreId of tmStoreIds) {
            const tmStore = await monsterManager.getTmStore(tmStoreId);
            console.log(`  ${tmStoreId}: ${tmStore.constructor.id} access: ${tmStore.access} partitioning: ${tmStore.partitioning}`);
            const pairs = await monsterManager.tmm.getAvailableLangPairs(tmStore);
            for (const [ srcLang, tgtLang ] of pairs) {
                const toc = await tmStore.getTOC(srcLang, tgtLang);
                const blocks = Object.values(toc.blocks);
                const jobs = blocks.reduce((acc, block) => acc + block.jobs.length, 0);
                console.log(`      * ${srcLang}/${tgtLang}: ${blocks.length.toLocaleString()} blocks ${jobs.toLocaleString()} jobs`);
            }
        }
    }
}
