import { utils } from '@l10nmonster/helpers';

export class ResourceFilter {
    #resourceFilter;
    #normalizers;
    #defaultMessageFormat;
    #segmentDecorators;

    constructor({ resourceFilter, normalizers, defaultMessageFormat, segmentDecorators }) {
        this.#resourceFilter = resourceFilter;
        this.#normalizers = normalizers;
        this.#defaultMessageFormat = defaultMessageFormat;
        this.#segmentDecorators = segmentDecorators;
    }

    #populateGuid(rid, str, mf, base, flags = {}) {
        base.mf = mf;
        const normalizer = this.#normalizers[base.mf];
        base.nstr = normalizer.decode(str, flags);
        base.gstr = utils.flattenNormalizedSourceToOrdinal(base.nstr);
        base.guid = utils.generateFullyQualifiedGuid(rid, base.sid, base.gstr);
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
                            throw `unknown placeholder found: ${JSON.stringify(part)}`;
                        }
                    }
                });
            } else {
                throw `source and target are incompatible\n${JSON.stringify(nsrc)}\n${JSON.stringify(entry.ntgt)}`;
            }
        } else {
            throw `TM entry missing or in flight`;
        }
    }

    #encodeTranslatedSegment(ntgt, mf, flags) {
        const normalizer = this.#normalizers[mf];
        return ntgt.map((part, idx) => normalizer.encodePart(part, {
            ...flags,
            isFirst: idx === 0,
            isLast: idx === ntgt.length - 1
        })).join('');
    }

    async getNormalizedResource(rid, resource, isSource) {
        let parsedRes = await this.#resourceFilter.parseResource({ resource, isSource });
        const segments = [];
        for (const rawSegment of parsedRes.segments) {
            const { str, notes, mf, ...normalizedSeg } = rawSegment;
            this.#populateGuid(rid, str, mf ?? this.#defaultMessageFormat, normalizedSeg);
            if (typeof notes === 'string') {
                normalizedSeg.rawNotes = notes;
                normalizedSeg.notes = utils.extractStructuredNotes(notes);
            }
            // populate ph samples from comments
            if (normalizedSeg.notes?.ph) {
                for (const part of normalizedSeg.nstr) {
                    if (part.t === 'x' && normalizedSeg.notes.ph[part.v]?.sample !== undefined && part.s === undefined) {
                        part.s = normalizedSeg.notes.ph[part.v].sample;
                    }
                }
            }
            if (this.#segmentDecorators) {
                let decoratedSeg = normalizedSeg;
                for (const decorator of this.#segmentDecorators) {
                    decoratedSeg = decorator(decoratedSeg);
                    if (decoratedSeg === undefined) { // this basically means DNT (or more like "pretend this doesn't exist")
                        break;
                    }
                }
                if (decoratedSeg !== undefined) {
                    Object.freeze(decoratedSeg);
                    segments.push(decoratedSeg);
                }
            } else {
                Object.freeze(normalizedSeg);
                segments.push(normalizedSeg);
            }
        }
        Object.freeze(segments);
        return { segments };
    }

    async generateTranslatedResource(resHandle, tm) {
        // give priority to generators over translators (for performance), if available
        if (this.#resourceFilter.generateResource) {
            const translations = [];
            for (const seg of resHandle.segments) {
                const entry = tm.getEntryByGuid(seg.guid);
                try {
                    const translation = this.#translateWithTMEntry(seg.nstr, entry);
                    translation !== undefined && translations.push(translation);
                } catch(e) {
                    l10nmonster.logger.verbose(`Problem translating guid ${seg.guid} to ${tm.targetLang}: ${e.stack ?? e}`);
                }
            }
            return this.#resourceFilter.generateResource({ ...resHandle, translations });
        }
        const sourceLookup = Object.fromEntries(resHandle.segments.map(seg => [ seg.sid, seg ]));
        const flags = { sourceLang: resHandle.sourceLang, targetLang: tm.targetLang, prj: resHandle.prj };
        const translator = async (sid, str) => {
            const normalizedSource = sourceLookup[sid];
            if (normalizedSource) {
                const segToTranslate = this.#populateGuid(resHandle.id, str, normalizedSource.mf, { sid }, flags);
                if (normalizedSource.guid !== segToTranslate.guid) {
                    l10nmonster.logger.verbose(`Normalized source outdated: ${normalizedSource.gstr}\n${segToTranslate.gstr}`);
                    return undefined;
                }
                const entry = tm.getEntryByGuid(segToTranslate.guid);
                if (!entry) {
                    l10nmonster.logger.verbose(`${tm.targetLang} translation not found for ${resHandle.id}, ${sid}, ${str}`);
                    return undefined;
                }
                try {
                    const normalizedTranslation = this.#translateWithTMEntry(normalizedSource.nstr, entry);
                    return this.#encodeTranslatedSegment(normalizedTranslation, normalizedSource.mf, flags);
                } catch(e) {
                    l10nmonster.logger.verbose(`Problem translating ${resHandle.id}, ${sid}, ${str} to ${tm.targetLang}: ${e.stack ?? e}`);
                    return undefined;
                }
            } else {
                l10nmonster.logger.verbose(`Dropping ${sid} in ${resHandle.id} as it's missing from normalized source`);
                return undefined;
            }
        };
        return this.#resourceFilter.translateResource({ resource: resHandle.raw, translator });
   }
}
