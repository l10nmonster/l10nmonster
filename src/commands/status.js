export async function statusCmd(mm, { limitToLang }) {
    const status = {
        numSources: (await mm.source.getResources()).length,
        lang: {},
    };
    const targetLangs = await mm.source.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const leverage = await mm.estimateTranslationJob({ targetLang });
        status.lang[targetLang] = {
            leverage,
        };
        mm.ctx.logger.info(`Calculated status of ${targetLang}`);
    }
    return status;
}
