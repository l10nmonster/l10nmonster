export async function translateCmd(mm, { limitToLang, dryRun }) {
    const status = { generatedResources: {}, deleteResources: {} };
    const targetLangs = await mm.getTargetLangs(limitToLang);
    const allResources = await mm.rm.getAllResources({ keepRaw: true });
    for await (const resHandle of allResources) {
        for (const targetLang of targetLangs) {
            if (resHandle.targetLangs.includes(targetLang) && (l10nmonster.prj === undefined || l10nmonster.prj.includes(resHandle.prj))) {
                const tm = await mm.tmm.getTM(resHandle.sourceLang, targetLang);
                const translatedRes = await resHandle.generateTranslatedRawResource(tm);
                if (dryRun) {
                    // let currentRaw;
                    // try {
                    //     currentRaw = await pipeline.target.fetchTranslatedResource(targetLang, resourceId);
                    // } catch (e) {
                    //     l10nmonster.logger.info(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}: ${e.stack ?? e}`);
                    // }
                    // if (currentRaw) {
                    //     const currentParsed = await pipeline.resourceFilter.parseResource({ resource: currentRaw, isSource: false });
                    //     const currentFlattened = {};
                    //     currentParsed.segments.forEach(x => currentFlattened[x.sid] = x.str);
                    //     const newParsed = translatedRes ?
                    //         await pipeline.resourceFilter.parseResource({ resource: translatedRes, isSource: false }) :
                    //         { segments: [] };
                    //     const newFlattened = {};
                    //     newParsed.segments.forEach(x => newFlattened[x.sid] = x.str);
                    //     const diff = diffJson(currentFlattened, newFlattened)
                    //         .filter(x => x.added ?? x.removed)
                    //         .map(x => [ Boolean(x.added), x.value ]);
                    //     diff && (status.diff[targetLang][translatedResourceId] = diff);
                    // }
                } else {
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
