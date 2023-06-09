import { diffJson } from 'diff';
import { utils } from '@l10nmonster/helpers';

function shouldDNT(decorators, seg) {
    if (decorators) {
        for (const decorator of decorators) {
            seg = decorator(seg);
            if (seg === undefined) { // this basically means DNT (or more like "pretend this doesn't exist")
                return true;
            }
        }
    }
    return false;
}

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
            if (res.targetLangs.includes(targetLang) && (l10nmonster.prj === undefined || l10nmonster.prj.includes(res.prj))) {
                const resourceId = res.id;
                const pipeline = mm.contentTypes[res.contentType];
                const encodePart = utils.partEncoderMaker(pipeline.textEncoders, pipeline.codeEncoders);
                // eslint-disable-next-line complexity
                const translator = async function translate(sid, str) {
                    const flags = { sourceLang, targetLang, prj: res.prj };
                    const seg = { sid, nstr: utils.getNormalizedString(str, pipeline.decoders, flags) };
                    if (shouldDNT(pipeline.segmentDecorator, seg)) {
                        l10nmonster.logger.verbose(`Dropping ${sid} in ${resourceId} as decided by segment decorator`);
                        return undefined;
                    }
                    const flattenSrc = utils.flattenNormalizedSourceToOrdinal(seg.nstr);
                    const guid = utils.generateFullyQualifiedGuid(resourceId, sid, flattenSrc);
                    const entry = tm.getEntryByGuid(guid);
                    try {
                        return utils.translateWithEntry(seg.nstr, entry, flags, encodePart);
                    } catch(e) {
                        l10nmonster.logger.verbose(`Problem translating ${resourceId}+${sid}+${str} to ${targetLang}: ${e.stack ?? e}`);
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
                        l10nmonster.logger.info(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}: ${e.stack ?? e}`);
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
