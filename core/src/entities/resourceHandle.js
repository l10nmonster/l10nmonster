import { L10nContext } from '@l10nmonster/core';

/**
 * @class ResourceHandle
 * @classdesc Represents a handle to a localization resource.
 * It contains metadata about the resource, such as its ID, channel, format,
 * source and target languages, and the raw content or parsed segments.
 * It uses a format handler to load and normalize raw resource content and
 * to generate translated raw resources.
 */
export class ResourceHandle {
    #formatHandler;

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
            L10nContext.logger.verbose(`Unknown properties in resource handle: ${Object.keys(other).join(', ')}`);
        }
    }

    loadFromNormalizedResource(normalizedResource) {
        const { segments, subresources } = normalizedResource;
        this.segments = segments;
        this.subresources = subresources;
        return this;
    }

    async loadResourceFromRaw(rawResource, options) {
        const normalizedResource = await this.#formatHandler.getNormalizedResource(this.id, rawResource, options.isSource);
        this.raw = rawResource;
        return this.loadFromNormalizedResource(normalizedResource);
    }

    async generateTranslatedRawResource(tm) {
        return this.#formatHandler.generateTranslatedResource(this, tm);
    }
}
