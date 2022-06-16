export async function statusCmd(mm, { limitToLang }) {
    await mm.updateSourceCache();
    mm.ctx.logger.info(`Source cache updated`);
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
        mm.ctx.logger.info(`Calculated status of ${targetLang}`);
    }
    return status;
}
