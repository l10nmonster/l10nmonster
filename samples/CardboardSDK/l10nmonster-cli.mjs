export function setupExtensions(monsterCLI, cliCtx) {
    monsterCLI.command('mystats')
    .description('Just a demo of how to create your own commands')
    .option('-l, --lang <language>', 'restrict to language')
    .action(async function mystats() {
        const mm = cliCtx.monsterManager;
        // eslint-disable-next-line no-invalid-this
        const options = this.optsWithGlobals();
        const targetLangs = await mm.source.getTargetLangs(options.lang);
        for (const targetLang of targetLangs) {
            const stats = {};
            const allJobs = await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang);
            allJobs.forEach(entry => stats[entry[1].status] = (stats[entry[1].status] ?? 0) + 1);
            console.log(`Target language ${targetLang}: ${stats.done ?? 0} done ${stats.pending ?? 0} pending ${stats.req ?? 0} req`);
        }
    });

}
