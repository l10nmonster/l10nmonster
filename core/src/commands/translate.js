import { diffJson } from 'diff';
import { sharedCtx, utils } from '@l10nmonster/helpers';

export async function translateCmd(mm, { limitToLang, dryRun }) {
    const status = { generatedResources: {}, deleteResources: {}, diff: {} };
    const resourceStats = await mm.source.getResourceStats();
    const targetLangs = await mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const sourceLang = mm.sourceLang;
        const tm = await mm.tmm.getTM(sourceLang, targetLang);
        status.generatedResources[targetLang] = [];
        status.deleteResources[targetLang] = [];
        status.diff[targetLang] = {};
        for (const res of resourceStats) {
            if (res.targetLangs.includes(targetLang) && (sharedCtx().prj === undefined || sharedCtx().prj.includes(res.prj))) {
                const resourceId = res.id;
                const pipeline = mm.contentTypes[res.contentType];
                const encodePart = utils.partEncoderMaker(pipeline.textEncoders, pipeline.codeEncoders);
                // eslint-disable-next-line complexity
                const translator = async function translate(sid, src) {
                    const seg = { sid, str: src };
                    let nsrc;
                    const flags = { sourceLang, targetLang, prj: res.prj };
                    if (pipeline.decoders) {
                        const normalizedStr = utils.getNormalizedString(src, pipeline.decoders, flags);
                        if (normalizedStr[0] !== src) {
                            nsrc = normalizedStr;
                            seg.nstr = normalizedStr;
                        }
                    }
                    if (pipeline.segmentDecorator && pipeline.segmentDecorator([ seg ], targetLang).length === 0) {
                        sharedCtx().logger.info(`Dropping ${sid} in ${resourceId} as decided by segment decorator`);
                        return undefined;
                    }
                    const flattenSrc = nsrc ? utils.flattenNormalizedSourceToOrdinal(nsrc) : src;
                    const guid = utils.generateFullyQualifiedGuid(resourceId, sid, flattenSrc);
                    const entry = tm.getEntryByGuid(guid);
                    try {
                        return utils.translateWithEntry(src, nsrc, entry, flags, encodePart);
                    } catch(e) {
                        sharedCtx().logger.verbose(`Problem translating ${resourceId}+${sid}+${src} to ${targetLang}: ${e.stack ?? e}`);
                        return undefined;
                    }
                };
                let translatedRes;
                // give priority to generators over translators (for performance)
                if (pipeline.resourceFilter.generateResource) {
                    const resource = await mm.source.getResource(res); // note that this is the source manager, not the source adapter
                    translatedRes = await pipeline.resourceFilter.generateResource({ resource, translator });
                } else {
                    const resource = await pipeline.source.fetchResource(res.id);
                    translatedRes = await pipeline.resourceFilter.translateResource({ resource, translator });
                }
                const translatedResourceId = pipeline.target.translatedResourceId(targetLang, resourceId);
                if (dryRun) {
                    let currentRaw;
                    try {
                        currentRaw = await pipeline.target.fetchTranslatedResource(targetLang, resourceId);
                    } catch (e) {
                        sharedCtx().logger.info(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}: ${e.stack ?? e}`);
                    }
                    if (currentRaw) {
                        const currentParsed = await pipeline.resourceFilter.parseResource({ resource: currentRaw, isSource: false });
                        const currentFlattened = {};
                        currentParsed.segments.forEach(x => currentFlattened[x.sid] = x.str);
                        const newParsed = translatedRes ?
                            await pipeline.resourceFilter.parseResource({ resource: translatedRes, isSource: false }) :
                            { segments: [] };
                        const newFlattened = {};
                        newParsed.segments.forEach(x => newFlattened[x.sid] = x.str);
                        const diff = diffJson(currentFlattened, newFlattened)
                            .filter(x => x.added ?? x.removed)
                            .map(x => [ Boolean(x.added), x.value ]);
                        diff && (status.diff[targetLang][translatedResourceId] = diff);
                    }
                } else {
                    await pipeline.target.commitTranslatedResource(targetLang, resourceId, translatedRes);
                    (translatedRes === null ? status.deleteResources : status.generatedResources)[targetLang].push(translatedResourceId);
                }
            }
        }
    }
    return status;
}
