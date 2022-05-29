export async function statusCmd(mm, { limitToLang }) {
    await mm.updateSourceCache();
    const status = {
        numSources: mm.getSourceCacheEntries().length,
        lang: {},
    };
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const leverage = await mm.estimateTranslationJob({ targetLang });
        status.lang[targetLang] = {
            leverage,
        };
        if (mm.ctx.build && mm.ctx.release && mm.stateStore) {
            // TODO: calculate passing grade based on config and add it to status
            await mm.stateStore.updateBuildState(mm.ctx.build, mm.ctx.release, targetLang, leverage);
        }
    }
    return status;
}
