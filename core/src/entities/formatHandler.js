import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';

function processNotes(normalizedSeg) {
    if (typeof normalizedSeg.notes === 'string') {
        normalizedSeg.rawNotes = normalizedSeg.notes;
        normalizedSeg.notes = utils.extractStructuredNotes(normalizedSeg.notes);
    }
    if (normalizedSeg.notes !== null && typeof normalizedSeg.notes === 'object') { // unfortunately null is an object
        // populate ph samples from comments
        if (normalizedSeg.notes.ph) {
            for (const part of normalizedSeg.nstr) {
                if (part.t === 'x' && normalizedSeg.notes.ph[part.v]?.sample !== undefined && part.s === undefined) {
                    part.s = normalizedSeg.notes.ph[part.v].sample;
                }
            }
        }
    } else {
        delete normalizedSeg.notes;
    }
}

/**
 * @class FormatHandler
 * @classdesc Handles the parsing, normalization, and translation of resources
 * for a specific file format. It uses resource filters to parse raw resource
 * content, normalizers to convert messages into a canonical representation,
 * and segment decorators to modify segments before translation.
 */
export class FormatHandler {
    #id;
    #resourceFilter;
    #normalizers;
    #defaultMessageFormat;
    #segmentDecorators;
    #formatHandlers;

    constructor({ id, resourceFilter, normalizers, defaultMessageFormat, segmentDecorators, formatHandlers }) {
        if (!resourceFilter) {
            throw new Error(`Missing resource filter for format ${this.#id}`);
        }
        this.#id = id;
        this.#resourceFilter = resourceFilter;
        this.#normalizers = normalizers;
        this.#defaultMessageFormat = defaultMessageFormat;
        this.#segmentDecorators = segmentDecorators;
        this.#formatHandlers = formatHandlers; // this is needed to process sub-resources
    }

    #populateGuid(rid, str, mf, base, flags = {}) {
        base.mf = mf;
        const normalizer = this.#normalizers[base.mf];
        if (!normalizer) {
            throw new Error(`Unknown message format ${mf} in format ${this.#id}`);
        }
        base.nstr = normalizer.decode(str, flags);
        const firedFlags = Object.entries(flags).filter(f => f[1]).map(f => f[0]);
        firedFlags.length > 0 && (base.flags = firedFlags);
        base.gstr = utils.flattenNormalizedSourceToOrdinal(base.nstr);
        base.guid = utils.generateGuid(`${rid}|${base.sid}|${base.gstr}`);
        return base;
    }

    #translateWithTMEntry(nsrc, entry) {
        if (entry && !entry.inflight) {
            if (utils.sourceAndTargetAreCompatible(nsrc, entry.ntgt)) {
                const phMatcher = utils.phMatcherMaker(nsrc);
                return entry.ntgt.map(part => {
                    if (typeof part === 'string') {
                        return part;
                    } else {
                        const ph = phMatcher(part);
                        if (ph) {
                            return ph;
                        } else {
                            throw new Error(`unknown placeholder found: ${JSON.stringify(part)}`);
                        }
                    }
                });
            } else {
                throw new Error(`source and target are incompatible\n${JSON.stringify(nsrc)}\n${JSON.stringify(entry.ntgt)}`);
            }
        } else {
            throw new Error(`TM entry missing or in flight`);
        }
    }

    #encodeTranslatedSegment(ntgt, mf, flags) {
        const normalizer = this.#normalizers[mf];
        if (!normalizer) {
            throw new Error(`Unknown message format ${mf} in format ${this.#id}`);
        }
        const encodedParts = ntgt.map((part, idx) => normalizer.encodePart(part, {
            ...flags,
            isFirst: idx === 0,
            isLast: idx === ntgt.length - 1
        }));
        return normalizer.join(encodedParts);
    }

    async getNormalizedResource(rid, resource, isSource) {
        let parsedRes = await this.#resourceFilter.parseResource({ resource, isSource });
        const normalizedSegments = []; // these have nstr
        const rawSegments = parsedRes.segments ?? []; // these have str
        for (const rawSegment of rawSegments.flat(1)) {
            const { str, mf, ...normalizedSeg } = rawSegment;
            this.#populateGuid(rid, str, mf ?? this.#defaultMessageFormat, normalizedSeg);
            processNotes(normalizedSeg);
            let decoratedSeg = normalizedSeg;
            if (this.#segmentDecorators) {
                for (const decorator of this.#segmentDecorators) {
                    decoratedSeg = decorator(decoratedSeg);
                    if (decoratedSeg === undefined) { // this basically means DNT (or more like "pretend this doesn't exist")
                        logVerbose`Decorator rejected segment ${normalizedSeg.sid} in resource ${rid}`;
                        break;
                    }
                }
                processNotes(decoratedSeg); // we may need to process notes again as they may have changed in the decorator
            }
            if (decoratedSeg !== undefined) {
                // Object.freeze(decoratedSeg);
                normalizedSegments.push(decoratedSeg);
            }
        }
        let subresources;
        if (parsedRes.subresources) {
            subresources = [];
            for (const subres of parsedRes.subresources) {
                const subFormat = this.#formatHandlers[subres.resourceFormat];
                const parsedSubres = await subFormat.getNormalizedResource(rid, subres.raw, true);
                if (parsedSubres.segments) {
                    subres.guids = parsedSubres.segments.map(seg => seg.guid);
                    normalizedSegments.push(parsedSubres.segments);
                    subresources.push(subres);
                }
            }
        }
        const segments = normalizedSegments.flat(1);
        // Object.freeze(segments);
        return { segments, subresources };
    }

    async generateTranslatedResource(resHandle, tm) {
        const flags = { sourceLang: resHandle.sourceLang, targetLang: tm.targetLang, prj: resHandle.prj };

        // give priority to generators over translators (for performance), if available
        if (this.#resourceFilter.generateResource) {
            const guidsToSkip = [];
            let subresources;
            if (resHandle.subresources) {
                subresources = [];
                for (const subres of resHandle.subresources) {
                    const subFormat = this.#formatHandlers[subres.resourceFormat];
                    if (!subFormat) {
                        throw new Error(`Unknown resource format ${subres.resourceFormat} for subresource of ${this.#id}`);
                    }
                    const { id, guids, ...subresHandle } = subres;
                    guidsToSkip.push(guids);
                    const subresGuids = new Set(guids);
                    const subresSegments = resHandle.segments.filter(seg => subresGuids.has(seg.guid));
                    const translatedSubres = await subFormat.generateTranslatedResource({
                        ...resHandle,
                        ...subresHandle,
                        segment: subresSegments,
                    }, tm);
                    translatedSubres !== undefined && subresources.push({
                        ...subresHandle,
                        id,
                        raw: translatedSubres,
                    });
                }
            }
            const translator = async (seg) => {
                const entry = tm.getEntryByGuid(seg.guid);
                try {
                    const nstr = this.#translateWithTMEntry(seg.nstr, entry);
                    if (nstr !== undefined) {
                        const segmentFlags = Object.fromEntries((seg.flags ?? []).map(f => [ f, true ]));
                        const str =this.#encodeTranslatedSegment(nstr, seg.mf, { ...flags, ...segmentFlags });
                        return { nstr, str, tu: entry };
                    }
                } catch(e) {
                    logVerbose`Problem translating guid ${seg.guid} to ${tm.targetLang}: ${e.message ?? e}`;
                }
            };
            return this.#resourceFilter.generateResource({ ...resHandle, translator, subresources });
        }

        // if generator is not available, use translator-based resource transformation
        const sourceLookup = Object.fromEntries(resHandle.segments.map(seg => [ seg.sid, seg ]));
        const translator = async (sid, str) => {
            const segmentFlags = { ...flags };
            const normalizedSource = sourceLookup[sid];
            if (normalizedSource) {
                const segToTranslate = this.#populateGuid(resHandle.id, str, normalizedSource.mf, { sid }, segmentFlags);
                if (normalizedSource.guid !== segToTranslate.guid) {
                    logVerbose`Normalized source outdated: ${normalizedSource.gstr}\n${segToTranslate.gstr}`;
                    return undefined;
                }
                const entry = tm.getEntryByGuid(segToTranslate.guid);
                if (!entry) {
                    // L10nContext.logger.verbose(`${tm.targetLang} translation not found for ${resHandle.id}, ${sid}, ${str}`);
                    return undefined;
                }
                try {
                    const normalizedTranslation = this.#translateWithTMEntry(normalizedSource.nstr, entry);
                    return this.#encodeTranslatedSegment(normalizedTranslation, normalizedSource.mf, segmentFlags);
                } catch(e) {
                    logVerbose`Problem translating ${resHandle.id}, ${sid}, ${str} to ${tm.targetLang}: ${e.message ?? e}`;
                    return undefined;
                }
            } else {
                logVerbose`Dropping ${sid} in ${resHandle.id} as it's missing from normalized source`;
                return undefined;
            }
        };
        return this.#resourceFilter.translateResource({ resource: resHandle.raw, translator });
   }
}
