import { diffJson } from 'diff';
import { getNormalizedString, flattenNormalizedSourceToOrdinal, flattenNormalizedSourceV1, sourceAndTargetAreCompatible } from '../normalizers/util.js';
import { consoleColor } from './shared.js';

export async function translateCmd(mm, { limitToLang, dryRun }) {
    const status = { generatedResources: {}, diff: {} };
    const resourceStats = await mm.fetchResourceStats();
    const targetLangs = mm.getTargetLangs(limitToLang, resourceStats);
    for (const targetLang of targetLangs) {
        const verbose = mm.verbose;
        const sourceLang = mm.sourceLang;
        const tm = await mm.tmm.getTM(sourceLang, targetLang);
        status.generatedResources[targetLang] = [];
        status.diff[targetLang] = {};
        for (const res of resourceStats) {
            if (res.targetLangs.includes(targetLang) && (mm.ctx.prj === undefined || mm.ctx.prj.includes(res.prj))) {
                const resourceId = res.id;
                const pipeline = mm.contentTypes[res.contentType];
                const encodeString = function encodeString(part, flags) {
                    let str,
                        encoders;
                    if (typeof part === 'string') {
                        encoders = pipeline.textEncoders;
                        str = part;
                    } else {
                        encoders = pipeline.codeEncoders;
                        str = part.v;
                    }
                    if (encoders) {
                        return encoders.reduce((s, encoder) => encoder(s, flags), str);
                    } else {
                        return str;
                    }
                };
                // eslint-disable-next-line complexity
                const translator = async function translate(sid, src) {
                    let nsrc,
                        v1PhMap,
                        valueMap;
                    const flags = {};
                    if (pipeline.decoders) {
                        const normalizedStr = getNormalizedString(src, pipeline.decoders, flags);
                        if (normalizedStr[0] !== src) {
                            nsrc = normalizedStr;
                            v1PhMap = flattenNormalizedSourceV1(nsrc)[1];
                            valueMap = Object.fromEntries(Object.values(v1PhMap).map(e => [ e.v, true ]));
                        }
                    }
                    const flattenSrc = nsrc ? flattenNormalizedSourceToOrdinal(nsrc) : src;
                    const guid = mm.generateFullyQualifiedGuid(resourceId, sid, flattenSrc);
                    const entry = tm.getEntryByGuid(guid);
                    if (entry) {
                        if (sourceAndTargetAreCompatible(nsrc ?? src, entry.ntgt ?? entry.tgt)) {
                            if (entry.ntgt) {
                                const ntgtEntries = entry.ntgt.entries();
                                const tgt = [];
                                for (const [idx, part] of ntgtEntries) {
                                    const partFlags = { ...flags, isFirst: idx === 0, isLast: idx === ntgtEntries.length - 1 };
                                    if (typeof part === 'string') {
                                        tgt.push(encodeString(part, partFlags));
                                    } else if (part?.v1) {
                                        if (v1PhMap && v1PhMap[part.v1]) {
                                            tgt.push(encodeString(v1PhMap[part.v1], partFlags));
                                        } else {
                                            verbose && console.error(`Incompatible v1 placeholder found: ${JSON.stringify(part)} in ${sourceLang}_${targetLang} entry for ${resourceId}+${sid}+${src}`);
                                            return undefined;
                                        }
                                    } else if (part?.v === undefined) {
                                        verbose && console.error(`Unknown placeholder found: ${JSON.stringify(part)} in ${sourceLang}_${targetLang} entry for ${resourceId}+${sid}+${src}`);
                                        return undefined;
                                    } else {
                                        if (valueMap[part.v]) {
                                            tgt.push(encodeString(part, partFlags));
                                        } else {
                                            verbose && console.error(`Incompatible value placeholder found: ${JSON.stringify(part)} in ${sourceLang}_${targetLang} entry for ${resourceId}+${sid}+${src}`);
                                            return undefined;
                                        }
                                    }
                                }
                                return tgt.join('');
                            } else {
                                return encodeString(entry.tgt, { ...flags, isFirst: true, isLast: true });
                            }
                        } else {
                            verbose && console.error(`Source ${resourceId}+${sid}+${src} is incompatible with ${sourceLang}_${targetLang} TM entry ${JSON.stringify(entry)}`);
                        }
                    } else {
                        verbose && console.error(`Couldn't find ${sourceLang}_${targetLang} entry for ${resourceId}+${sid}+${src}`);
                    }
                    return undefined;
                };
                const resource = await pipeline.source.fetchResource(res.id);
                const translatedRes = await pipeline.resourceFilter.generateTranslatedResource({ resource, targetLang, translator });
                const translatedResourceId = pipeline.target.translatedResourceId(targetLang, resourceId);
                if (dryRun) {
                    let currentRaw;
                    try {
                        currentRaw = await pipeline.target.fetchTranslatedResource(targetLang, resourceId);
                    } catch (e) {
                        verbose && console.log(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}`);
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
                            .map(x => `${x.added ? `${consoleColor.green}+` : `${consoleColor.red}-`} ${x.value}${consoleColor.reset}`)
                            .join('');
                        diff && (status.diff[targetLang][translatedResourceId] = diff);
                    }
                } else if (translatedRes === null) {
                    verbose && console.log(`${targetLang}: Skipping commit of empty resource ${translatedResourceId}`);
                } else {
                    await pipeline.target.commitTranslatedResource(targetLang, resourceId, translatedRes);
                    status.generatedResources[targetLang].push(translatedResourceId);
                }
            }
        }
    }
    return status;
}
