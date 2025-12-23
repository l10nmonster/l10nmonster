import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { requiredSourcePluralForms, requiredTargetPluralForms } from '../requiredPluralForms.js';

/**
 * @typedef {import('../../index.js').NormalizedString} NormalizedString
 * @typedef {import('../../index.js').ResourceFilter} ResourceFilter
 * @typedef {import('../../index.js').ResourceGenerator} ResourceGenerator
 * @typedef {import('../../index.js').Subresource} Subresource
 * @typedef {import('./normalizer.js').Normalizer} Normalizer
 * @typedef {import('./resourceHandle.js').ResourceHandle} ResourceHandle
 * @typedef {import('./resourceHandle.js').RawSegment} RawSegment
 * @typedef {import('./resourceHandle.js').NormalizedSegment} NormalizedSegment
 * @typedef {import('./resourceHandle.js').NormalizedResource} NormalizedResource
 * @typedef {import('../tmManager/tm.js').TM} TM
 */

/**
 * Segment decorator function signature.
 * @callback SegmentDecorator
 * @param {NormalizedSegment} segment - The segment to decorate.
 * @returns {NormalizedSegment|undefined} The decorated segment, or undefined to skip it.
 */

/**
 * FormatHandler constructor options.
 * @typedef {Object} FormatHandlerConstructorOptions
 * @property {string} id - Unique format handler identifier.
 * @property {ResourceFilter} resourceFilter - Filter for parsing raw resources.
 * @property {ResourceGenerator} [resourceGenerator] - Generator for producing translations (defaults to resourceFilter).
 * @property {Object<string, Normalizer>} normalizers - Map of message format ID to Normalizer.
 * @property {string} defaultMessageFormat - Default message format for segments without explicit format.
 * @property {SegmentDecorator[]} [segmentDecorators] - Array of decorators to apply to segments.
 * @property {Object<string, FormatHandler>} [formatHandlers] - Map of format handlers for processing subresources.
 */

/**
 * FormatHandler info returned by getInfo().
 * @typedef {Object} FormatHandlerInfo
 * @property {string} id - Format handler identifier.
 * @property {string} resourceFilter - Resource filter class name.
 * @property {string} resourceGenerator - Resource generator class name.
 * @property {string[]} messageFormats - Available message format IDs.
 * @property {string} defaultMessageFormat - Default message format ID.
 */

/**
 * Options for getNormalizedResource().
 * @typedef {Object} GetNormalizedResourceOptions
 * @property {boolean} isSource - Whether this is a source (true) or target (false) resource.
 * @property {string} sourceLang - Source language code.
 * @property {string[]} [targetLangs] - Target language codes.
 */

/**
 * Processes notes attached to a segment, extracting structured information
 * and populating placeholder samples.
 * @param {NormalizedSegment} normalizedSeg - The segment to process.
 */
function processNotes(normalizedSeg) {
    if (typeof normalizedSeg.notes === 'string') {
        normalizedSeg.rawNotes = normalizedSeg.notes;
        normalizedSeg.notes = utils.extractStructuredNotes(normalizedSeg.notes);
    }
    if (normalizedSeg.notes !== null && typeof normalizedSeg.notes === 'object') { // unfortunately null is an object
        // populate ph samples from comments
        if (normalizedSeg.notes.ph) {
            for (const part of normalizedSeg.nstr) {
                if (typeof part !== 'string' && part.t === 'x' && normalizedSeg.notes.ph[part.v]?.sample !== undefined && part.s === undefined) {
                    part.s = normalizedSeg.notes.ph[part.v].sample;
                }
            }
        }
    } else {
        delete normalizedSeg.notes;
    }
}

/**
 * Handles the parsing, normalization, and translation of resources
 * for a specific file format. It uses resource filters to parse raw resource
 * content, normalizers to convert messages into a canonical representation,
 * and segment decorators to modify segments before translation.
 */
export class FormatHandler {
    #id;
    #resourceFilter;
    #resourceGenerator;
    #normalizers;
    #defaultMessageFormat;
    #segmentDecorators;
    #formatHandlers;

    /**
     * Creates a new FormatHandler instance.
     * @param {FormatHandlerConstructorOptions} options - Constructor options.
     * @throws {Error} If resourceFilter is not provided.
     */
    constructor({ id, resourceFilter, resourceGenerator, normalizers, defaultMessageFormat, segmentDecorators, formatHandlers }) {
        if (!resourceFilter) {
            throw new Error(`Missing resource filter for format ${this.#id}`);
        }
        this.#id = id;
        this.#resourceFilter = resourceFilter;
        this.#resourceGenerator = resourceGenerator ?? resourceFilter;
        this.#normalizers = normalizers;
        this.#defaultMessageFormat = defaultMessageFormat;
        this.#segmentDecorators = segmentDecorators;
        this.#formatHandlers = formatHandlers; // this is needed to process sub-resources
    }

    /**
     * Returns information about this format handler's configuration.
     * @returns {FormatHandlerInfo} Format handler configuration summary.
     */
    getInfo() {
        return {
            id: this.#id,
            resourceFilter: this.#resourceFilter.constructor.name,
            resourceGenerator: this.#resourceGenerator.constructor.name,
            messageFormats: Object.keys(this.#normalizers),
            defaultMessageFormat: this.#defaultMessageFormat,
        };
    }

    /**
     * Populates a raw segment with guid and nstr to create a NormalizedSegment.
     * @param {string} rid - Resource identifier.
     * @param {string} str - Raw string to normalize.
     * @param {string} mf - Message format identifier.
     * @param {RawSegment} base - Raw segment to populate.
     * @param {Object} [flags] - Optional flags for normalization.
     * @returns {NormalizedSegment} The populated normalized segment.
     */
    #populateGuid(rid, str, mf, base, flags = {}) {

        /** @type {NormalizedSegment} */
        const seg = /** @type {any} */ (base);
        seg.mf = mf;
        const normalizer = this.#normalizers[seg.mf];
        if (!normalizer) {
            throw new Error(`Unknown message format ${mf} in format ${this.#id}`);
        }
        seg.nstr = normalizer.decode(str, flags);
        const firedFlags = Object.entries(flags).filter(f => f[1]).map(f => f[0]);
        firedFlags.length > 0 && (seg.flags = firedFlags);
        const gstr = utils.flattenNormalizedSourceToOrdinal(seg.nstr);
        seg.guid = utils.generateGuid(`${rid}|${seg.sid}|${gstr}`);
        return seg;
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

    /**
     * Parses and normalizes a raw resource into segments.
     * @param {string} rid - Resource identifier.
     * @param {string} resource - Raw resource content.
     * @param {GetNormalizedResourceOptions} [options] - Normalization options.
     * @returns {Promise<NormalizedResource>} Normalized resource with segments.
     */
    async getNormalizedResource(rid, resource, options = /** @type {GetNormalizedResourceOptions} */ ({})) {
        const { isSource, sourceLang, targetLangs } = options;
        const sourcePluralForms = requiredSourcePluralForms(sourceLang);
        const targetPluralForms = requiredTargetPluralForms(targetLangs);
        let parsedRes = await this.#resourceFilter.parseResource({ resource, isSource, sourcePluralForms, targetPluralForms });

        /** @type {NormalizedSegment[]} */
        const normalizedSegments = []; // these have nstr
        const rawSegments = parsedRes.segments ?? []; // these have str
        for (const rawSegment of rawSegments.flat(1)) {
            const { str, mf, ...rawSeg } = rawSegment;
            const normalizedSeg = this.#populateGuid(rid, str, mf ?? this.#defaultMessageFormat, /** @type {RawSegment} */ (rawSeg));
            processNotes(normalizedSeg);

            /** @type {NormalizedSegment | undefined} */
            let decoratedSeg = normalizedSeg;
            if (this.#segmentDecorators) {
                for (const decorator of this.#segmentDecorators) {
                    decoratedSeg = decorator(decoratedSeg);
                    if (decoratedSeg === undefined) { // this basically means DNT (or more like "pretend this doesn't exist")
                        logVerbose`Decorator rejected segment ${normalizedSeg.sid} in resource ${rid}`;
                        break;
                    }
                }
                decoratedSeg && processNotes(decoratedSeg); // we may need to process notes again as they may have changed in the decorator
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
                const parsedSubres = await subFormat.getNormalizedResource(rid, subres.raw, { isSource: true, sourceLang, targetLangs });
                if (parsedSubres.segments) {
                    subres.guids = parsedSubres.segments.map(seg => seg.guid);
                    normalizedSegments.push(...parsedSubres.segments);
                    subresources.push(subres);
                }
            }
        }
        const segments = normalizedSegments.flat(1);
        // Object.freeze(segments);
        return { segments, subresources };
    }

    /**
     * Generates translated raw resource content from a resource handle and translation memory.
     * @param {ResourceHandle} resHandle - The source resource handle with segments.
     * @param {TM} tm - Translation memory instance for the target language.
     * @returns {Promise<string|undefined>} The generated raw translated content, or undefined if generation fails.
     */
    async generateTranslatedResource(resHandle, tm) {
        const flags = { sourceLang: resHandle.sourceLang, targetLang: tm.targetLang, prj: resHandle.prj };
        const translations = await tm.getEntries(resHandle.segments.map(seg => seg.guid));

        // Compute plural forms for source and target languages
        const sourcePluralForms = requiredSourcePluralForms(resHandle.sourceLang);
        const targetPluralForms = requiredTargetPluralForms([tm.targetLang]);

        // give priority to generators over translators (for performance), if available
        if ('generateResource' in this.#resourceGenerator) {
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
                    const translatedSubres = await subFormat.generateTranslatedResource(/** @type {ResourceHandle} */ (/** @type {unknown} */ ({
                        ...resHandle,
                        ...subresHandle,
                        segments: subresSegments,
                    })), tm);
                    translatedSubres !== undefined && subresources.push({
                        ...subresHandle,
                        id,
                        raw: translatedSubres,
                    });
                }
            }
            const translator = async (seg) => {
                const entry = translations[seg.guid];
                try {
                    const nstr = this.#translateWithTMEntry(seg.nstr, entry);
                    if (nstr !== undefined) {
                        const segmentFlags = Object.fromEntries((seg.flags ?? []).map(f => [ f, true ]));
                        const str =this.#encodeTranslatedSegment(nstr, seg.mf, { ...flags, ...segmentFlags });
                        return { nstr, str, tu: entry };
                    }
                // eslint-disable-next-line no-unused-vars
                } catch(e) {
                    // logVerbose`Problem translating guid ${seg.guid} to ${tm.targetLang}: ${e.message ?? e}`;
                }
            };
            return this.#resourceGenerator.generateResource({ ...resHandle, translator, subresources, sourcePluralForms, targetPluralForms });
        }

        // if generator is not available, use translator-based resource transformation
        const sourceLookup = Object.fromEntries(resHandle.segments.map(seg => [ seg.sid, seg ]));
        const translator = async (sid, str) => {
            const segmentFlags = { ...flags };
            const normalizedSource = sourceLookup[sid];
            if (normalizedSource) {
                const segToTranslate = this.#populateGuid(resHandle.id, str, normalizedSource.mf, { sid }, segmentFlags);
                if (normalizedSource.guid !== segToTranslate.guid) {
                    logVerbose`Normalized source outdated: ${utils.flattenNormalizedSourceToOrdinal(normalizedSource.nstr)}\n${utils.flattenNormalizedSourceToOrdinal(segToTranslate.nstr)}`;
                    return undefined;
                }
                const entry = translations[segToTranslate.guid];
                if (!entry) {
                    // L10nContext.logger.verbose(`${tm.targetLang} translation not found for ${resHandle.id}, ${sid}, ${str}`);
                    return undefined;
                }
                try {
                    const normalizedTranslation = this.#translateWithTMEntry(normalizedSource.nstr, entry);
                    return this.#encodeTranslatedSegment(normalizedTranslation, normalizedSource.mf, segmentFlags);
                // eslint-disable-next-line no-unused-vars
                } catch(e) {
                    // logVerbose`Problem translating ${resHandle.id}, ${sid}, ${str} to ${tm.targetLang}: ${e.message ?? e}`;
                    return undefined;
                }
            } else {
                logVerbose`Dropping ${sid} in ${resHandle.id} as it's missing from normalized source`;
                return undefined;
            }
        };
        return this.#resourceFilter.translateResource({ resource: resHandle.raw, translator, sourcePluralForms, targetPluralForms });
   }
}
