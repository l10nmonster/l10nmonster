import { ResourceHandle } from './resourceHandle.js';

/**
 * @typedef {import('../../index.js').SourceAdapter} SourceAdapter
 * @typedef {import('../../index.js').TargetAdapter} TargetAdapter
 * @typedef {import('../../index.js').ResourceHeader} ResourceHeader
 * @typedef {import('../../index.js').TranslationPolicy} TranslationPolicy
 * @typedef {import('./formatHandler.js').FormatHandler} FormatHandler
 * @typedef {import('./formatHandler.js').FormatHandlerInfo} FormatHandlerInfo
 */

/**
 * Channel configuration object passed to the constructor.
 * @typedef {Object} ChannelConstructorOptions
 * @property {string} id - Unique channel identifier.
 * @property {SourceAdapter} source - Source adapter for fetching resources.
 * @property {Object<string, FormatHandler>} formatHandlers - Map of format ID to FormatHandler.
 * @property {string} defaultResourceFormat - Default format handler ID.
 * @property {TargetAdapter} target - Target adapter for committing translations.
 * @property {TranslationPolicy[]} translationPolicyPipeline - Array of translation policy functions.
 */

/**
 * Channel information returned by getInfo().
 * @typedef {Object} ChannelInfo
 * @property {string} id - Channel identifier.
 * @property {string} source - Source adapter class name.
 * @property {string} target - Target adapter class name.
 * @property {FormatHandlerInfo[]} formatHandlers - Array of format handler info objects.
 * @property {string} defaultResourceFormat - Default format handler ID.
 * @property {number} translationPolicies - Number of translation policies.
 */

/**
 * Represents a channel for managing localization resources,
 * including fetching source content, applying translation policies,
 * and committing translated resources.
 */
export class Channel {
    #id;
    #source;
    #formatHandlers;
    #defaultResourceFormat;
    #target;
    #translationPolicyPipeline;

    /**
     * Creates a new Channel instance.
     * @param {ChannelConstructorOptions} options - Channel configuration options.
     */
    constructor({ id, source, formatHandlers, defaultResourceFormat, target, translationPolicyPipeline }) {
        this.#id = id;
        this.#source = source;
        this.#formatHandlers = formatHandlers;
        this.#defaultResourceFormat = defaultResourceFormat;
        this.#target = target;
        this.#translationPolicyPipeline = translationPolicyPipeline;
    }

    /**
     * Returns information about this channel's configuration.
     * @returns {ChannelInfo} Channel configuration summary.
     */
    getInfo() {
        return {
            id: this.#id,
            source: this.#source.constructor.name,
            target: this.#target.constructor.name,
            formatHandlers: Object.values(this.#formatHandlers).map(fh => fh.getInfo()),
            defaultResourceFormat: this.#defaultResourceFormat,
            translationPolicies: this.#translationPolicyPipeline.length,
        };
    }

    /**
     * Creates a ResourceHandle from a resource header.
     * @param {ResourceHeader} resourceHeader - Resource metadata from source adapter.
     * @returns {ResourceHandle} A new ResourceHandle configured for this resource.
     * @throws {Error} If sourceLang is missing or no format handler is found.
     */
    makeResourceHandleFromHeader(resourceHeader) {
         // sources can provide resources of different formats but we have a default
        const resourceFormat = resourceHeader.resourceFormat ?? this.#defaultResourceFormat;
        if (!resourceHeader.sourceLang) {
            throw new Error(`Missing sourceLang in resource handle: ${JSON.stringify(resourceHeader)}`);
        }
        const formatHandler = this.#formatHandlers[resourceFormat];
        if (!formatHandler) {
            throw new Error(`No format handler found for resource format: ${resourceFormat}`);
        }
        return new ResourceHandle({
            channel: this.#id,
            resourceFormat: this.#defaultResourceFormat,
            formatHandler,
            ...resourceHeader,
        });
    }

    /**
     * Fetches all resources from the source, normalizes them, and applies translation policies.
     * @param {object} [options] - Options passed to the source adapter's fetchAllResources.
     * @yields {ResourceHandle} Normalized resource handles with policies applied.
     * @returns {AsyncGenerator<ResourceHandle>} Async generator of ResourceHandle instances.
     */
    async *getAllNormalizedResources(options) {
        for await (const [resourceHeader, rawResource] of this.#source.fetchAllResources(options)) {
            const handle = this.makeResourceHandleFromHeader(resourceHeader);
            await handle.loadResourceFromRaw(rawResource, { isSource: true });
            handle.applyPolicies(this.#translationPolicyPipeline);
            yield handle;
        }
    }

    /**
     * Fetches an existing translated resource from the target adapter.
     * @param {ResourceHandle} resourceHandle - The source resource handle.
     * @param {string} targetLang - Target language code.
     * @returns {Promise<ResourceHandle>} A ResourceHandle loaded with the existing translation.
     */
    async getExistingTranslatedResource(resourceHandle, targetLang) {
        const rawResource = await this.#target.fetchTranslatedResource(targetLang, resourceHandle.id);
        const translatedResource = this.makeResourceHandleFromHeader(resourceHandle);
        return translatedResource.loadResourceFromRaw(rawResource, { isSource: false });
    }

    /**
     * Commits a translated resource to the target adapter.
     * @param {string} targetLang - Target language code.
     * @param {string} resourceId - Source resource identifier.
     * @param {string} rawResource - Raw translated content to commit.
     * @returns {Promise<string>} The translated resource ID in the target system.
     */
    async commitTranslatedResource(targetLang, resourceId, rawResource) {
        const translatedResourceId = this.#target.translatedResourceId(targetLang, resourceId);
        await this.#target.commitTranslatedResource(targetLang, resourceId, rawResource);
        return translatedResourceId;
    }

}
