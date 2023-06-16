export async function translateCmd(mm, { limitToLang, dryRun }) {
    const status = { generatedResources: {}, deleteResources: {} };
    const targetLangs = await mm.getTargetLangs(limitToLang);
    const allResources = await mm.rm.getAllResources({ keepRaw: true });
    for await (const resHandle of allResources) {
        for (const targetLang of targetLangs) {
            if (resHandle.targetLangs.includes(targetLang) && (l10nmonster.prj === undefined || l10nmonster.prj.includes(resHandle.prj))) {
                const tm = await mm.tmm.getTM(resHandle.sourceLang, targetLang);
                const translatedRes = await resHandle.generateTranslatedRawResource(tm);
                if (!dryRun) {
                    status.generatedResources[targetLang] ??= [];
                    status.deleteResources[targetLang] ??= [];
                    const translatedResourceId = await mm.rm.getChannel(resHandle.channel)
                        .commitTranslatedResource(targetLang, resHandle.id, translatedRes);
                    (translatedRes === null ? status.deleteResources : status.generatedResources)[targetLang].push(translatedResourceId);
                }
            }
        }
    }
    return status;
}
