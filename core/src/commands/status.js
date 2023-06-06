
export async function statusCmd(mm, { limitToLang }) {
    const status = {
        lang: {},
    };
    const targetLangs = await mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const leverage = await mm.estimateTranslationJob({ targetLang });
        status.lang[targetLang] = {
            leverage,
        };
        status.numSources = leverage.numSources;
        l10nmonster.logger.info(`Calculated status of ${targetLang}`);
    }
    return status;
}
