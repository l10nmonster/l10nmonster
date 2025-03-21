import { L10nContext } from '@l10nmonster/core';

export async function statusCmd(mm, { limitToLang }) {
    const status = {
        lang: {},
        numSources: 0,
    };
    const targetLangs = await mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const leverage = await mm.estimateTranslationJob({ targetLang });
        status.lang[targetLang] = {
            leverage,
        };
        status.numSources = leverage.numSources;
        L10nContext.logger.info(`Calculated status of ${targetLang}`);
    }
    return status;
}
