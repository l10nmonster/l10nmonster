import { ResourceHandle } from './resourceHandle.js';

/**
 * @class Channel
 * @classdesc Represents a channel for managing localization resources,
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

    constructor({ id, source, formatHandlers, defaultResourceFormat, target, translationPolicyPipeline }) {
        this.#id = id;
        this.#source = source;
        this.#formatHandlers = formatHandlers;
        this.#defaultResourceFormat = defaultResourceFormat;
        this.#target = target;
        this.#translationPolicyPipeline = translationPolicyPipeline;
    }

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

    async *getAllNormalizedResources(options) {
        for await (const [resourceHeader, rawResource] of this.#source.fetchAllResources(options)) {
            const handle = this.makeResourceHandleFromHeader(resourceHeader);
            await handle.loadResourceFromRaw(rawResource, { isSource: true });
            handle.applyPolicies(this.#translationPolicyPipeline);
            yield handle;
        }
    }

    async getExistingTranslatedResource(resourceHandle, targetLang) {
        const rawResource = await this.#target.fetchTranslatedResource(targetLang, resourceHandle.id);
        const translatedResource = this.makeResourceHandleFromHeader(resourceHandle);
        return translatedResource.loadResourceFromRaw(rawResource, { isSource: false });
    }

    async commitTranslatedResource(targetLang, resourceId, rawResource) {
        const translatedResourceId = this.#target.translatedResourceId(targetLang, resourceId);
        await this.#target.commitTranslatedResource(targetLang, resourceId, rawResource);
        return translatedResourceId;
    }

}
