import { logVerbose } from '../l10nContext.js';

/**
 * @typedef {import('../../index.js').Segment} Segment
 * @typedef {import('../../index.js').TranslationPolicy} TranslationPolicy
 * @typedef {import('../../index.js').NormalizedSegment} NormalizedSegment
 * @typedef {import('../../index.js').TranslationPlan} TranslationPlan
 * @typedef {import('../../index.js').Subresource} Subresource
 * @typedef {import('./formatHandler.js').FormatHandler} FormatHandler
 * @typedef {import('../tmManager/tm.js').TM} TM
 */

/**
 * A raw segment before normalization (after destructuring str and mf from Segment).
 * Used as intermediate type during segment processing.
 * @typedef {Object} RawSegment
 * @property {string} sid - Segment ID.
 * @property {string} [notes] - Notes for translators.
 * @property {string} [pluralForm] - Plural form if applicable.
 * @property {string} [nid] - Native ID in original format.
 */

/**
 * Normalized resource structure returned by format handlers.
 * @typedef {Object} NormalizedResource
 * @property {NormalizedSegment[]} segments - Array of normalized segments.
 * @property {Subresource[]} [subresources] - Optional nested subresources.
 */

/**
 * Options for loading a resource from raw content.
 * @typedef {Object} LoadResourceOptions
 * @property {boolean} isSource - Whether this is a source (true) or target (false) resource.
 */

/**
 * ResourceHandle constructor options.
 * @typedef {Object} ResourceHandleConstructorOptions
 * @property {string} id - Resource identifier.
 * @property {string} channel - Channel ID this resource belongs to.
 * @property {string | number} [modified] - Last modified timestamp.
 * @property {string} resourceFormat - Format handler ID.
 * @property {FormatHandler} formatHandler - Format handler instance.
 * @property {string} sourceLang - Source language code.
 * @property {string[]} [targetLangs] - Target language codes.
 * @property {TranslationPlan} [plan] - Translation plan.
 * @property {string} [prj] - Project name for filtering.
 * @property {string} [raw] - Raw resource content.
 * @property {NormalizedSegment[]} [segments] - Parsed segments.
 * @property {Subresource[]} [subresources] - Nested subresources.
 */

/**
 * Represents a handle to a localization resource.
 * It contains metadata about the resource, such as its ID, channel, format,
 * source and target languages, and the raw content or parsed segments.
 * It uses a format handler to load and normalize raw resource content and
 * to generate translated raw resources.
 */
export class ResourceHandle {
    #formatHandler;

    /**
     * Creates a new ResourceHandle instance.
     * @param {ResourceHandleConstructorOptions} options - Constructor options.
     */
    constructor({ id, channel, modified, resourceFormat, formatHandler, sourceLang, targetLangs, plan, prj, raw, segments, subresources, ...other }) {
        this.id = id;
        this.channel = channel;
        this.modified = modified;
        this.resourceFormat = resourceFormat;
        this.#formatHandler = formatHandler;
        this.sourceLang = sourceLang;
        this.targetLangs = targetLangs;
        this.plan = plan;
        this.prj = prj;
        this.raw = raw;
        this.segments = segments;
        this.subresources = subresources;
        if (Object.keys(other).length > 1) {
            logVerbose`Unknown properties in resource handle: ${Object.keys(other).join(', ')}`;
        }
    }

    /**
     * Loads segments and subresources from a normalized resource.
     * @param {NormalizedResource} normalizedResource - The normalized resource data.
     * @returns {ResourceHandle} This instance for chaining.
     */
    loadFromNormalizedResource(normalizedResource) {
        const { segments, subresources } = normalizedResource;
        this.segments = segments;
        this.subresources = subresources;
        return this;
    }

    /**
     * Loads and normalizes a resource from raw content using the format handler.
     * @param {string} rawResource - Raw resource content.
     * @param {LoadResourceOptions} options - Load options.
     * @returns {Promise<ResourceHandle>} This instance for chaining.
     */
    async loadResourceFromRaw(rawResource, options) {
        const normalizedResource = await this.#formatHandler.getNormalizedResource(this.id, rawResource, {
            isSource: options.isSource,
            sourceLang: this.sourceLang,
            targetLangs: this.targetLangs,
        });
        this.raw = rawResource;
        return this.loadFromNormalizedResource(normalizedResource);
    }

    /**
     * Generates translated raw resource content from the current segments and TM.
     * @param {TM} tm - Translation memory instance for looking up translations.
     * @returns {Promise<string>} The generated raw translated content.
     */
    async generateTranslatedRawResource(tm) {
        return this.#formatHandler.generateTranslatedResource(this, tm);
    }

    /**
     * Applies translation policies to all segments, updating their translation plans.
     * @param {TranslationPolicy[]} translationPolicyPipeline - Array of policy functions to apply.
     * @returns {Promise<void>}
     */
    async applyPolicies(translationPolicyPipeline) {
        const targetLangs = new Set();
        for (const segment of this.segments) {

            /** @type {import('../interfaces.js').PolicyContext} */
            const policyContext = { plan: /** @type {import('../interfaces.js').TranslationPlan} */ ({}), seg: segment, res: /** @type {import('../interfaces.js').ResourceHandle} */ (/** @type {unknown} */ (this)) };
            translationPolicyPipeline.forEach((policy, index) => {
                const returnedContext = policy(policyContext);
                if (returnedContext) {
                    // eslint-disable-next-line no-unused-vars
                    const { res, seg, ...segmentProps } = returnedContext; // preserve res and seg in policyContext
                    Object.assign(policyContext, segmentProps);
                } else {
                    const policyName = policy.name || `policy[${index}]`;
                    throw new Error(`Policy ${policyName} returned nothing for resource ${this.id} segment ${segment.sid}`);
                }
            });
            // eslint-disable-next-line no-unused-vars
            const { res, seg, ...segmentProps } = policyContext; // extract segment properties generated by plan
            Object.assign(segment, segmentProps);
            Object.keys(segment.plan).forEach(targetLang => targetLangs.add(targetLang));
        }
        this.targetLangs = Array.from(targetLangs).sort();
    }
}
