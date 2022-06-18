import { diffJson } from 'diff';
import { getNormalizedString, flattenNormalizedSourceToOrdinal, sourceAndTargetAreCompatible, phMatcherMaker } from './normalizers/util.js';
import { consoleColor } from './shared.js';

export function translateWithEntry(src, nsrc, entry, flags, encodeString) {
    if (entry && !entry.inflight) {
        if (sourceAndTargetAreCompatible(nsrc ?? src, entry.ntgt ?? entry.tgt)) {
            if (entry.ntgt) {
                const phMatcher = phMatcherMaker(nsrc ?? [ src ]);
                const ntgtEntries = entry.ntgt.entries();
                const tgt = [];
                for (const [idx, part] of ntgtEntries) {
                    const partFlags = { ...flags, isFirst: idx === 0, isLast: idx === ntgtEntries.length - 1 };
                    if (typeof part === 'string') {
                        tgt.push(encodeString(part, partFlags));
                    } else {
                        const ph = phMatcher(part);
                        if (ph) {
                            tgt.push(encodeString(ph, partFlags));
                        } else {
                            throw `unknown placeholder found: ${JSON.stringify(part)}`;
                        }
                    }
                }
                return tgt.join('');
            } else {
                return encodeString(entry.tgt, { ...flags, isFirst: true, isLast: true });
            }
        } else {
            throw `source and target are incompatible`;
        }
    } else {
        throw `TM entry missing or in flight`;
    }
}

export async function translateCmd(mm, { limitToLang, dryRun }) {
    const status = { generatedResources: {}, deleteResources: {}, diff: {} };
    // eslint-disable-next-line no-unused-vars
    const resourceStats = (await mm.source.getEntries()).map(([rid, res]) => res);
    const targetLangs = await mm.source.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const sourceLang = mm.sourceLang;
        const tm = await mm.tmm.getTM(sourceLang, targetLang);
        status.generatedResources[targetLang] = [];
        status.deleteResources[targetLang] = [];
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
                    const seg = { sid, str: src };
                    let nsrc;
                    const flags = {};
                    if (pipeline.decoders) {
                        const normalizedStr = getNormalizedString(src, pipeline.decoders, flags);
                        if (normalizedStr[0] !== src) {
                            nsrc = normalizedStr;
                            seg.nstr = normalizedStr;
                        }
                    }
                    if (pipeline.segmentDecorator && pipeline.segmentDecorator([ seg ]).length === 0) {
                        mm.ctx.logger.info(`Dropping ${sid} in ${resourceId} as decided by segment decorator`);
                        return undefined;
                    }
                    const flattenSrc = nsrc ? flattenNormalizedSourceToOrdinal(nsrc) : src;
                    const guid = mm.generateFullyQualifiedGuid(resourceId, sid, flattenSrc);
                    const entry = tm.getEntryByGuid(guid);
                    try {
                        return translateWithEntry(src, nsrc, entry, flags, encodeString);
                    } catch(e) {
                        mm.ctx.logger.verbose(`Problem translating ${resourceId}+${sid}+${src} to ${targetLang}: ${e}`);
                        return undefined;
                    }
                };
                const resource = await pipeline.source.fetchResource(res.id);
                const translatedRes = await pipeline.resourceFilter.translateResource({ resource, translator });
                const translatedResourceId = pipeline.target.translatedResourceId(targetLang, resourceId);
                if (dryRun) {
                    let currentRaw;
                    try {
                        currentRaw = await pipeline.target.fetchTranslatedResource(targetLang, resourceId);
                    } catch (e) {
                        mm.ctx.logger.info(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}`);
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
                } else {
                    await pipeline.target.commitTranslatedResource(targetLang, resourceId, translatedRes);
                    (translatedRes === null ? status.deleteResources : status.generatedResources)[targetLang].push(translatedResourceId);
                }
            }
        }
    }
    return status;
}
