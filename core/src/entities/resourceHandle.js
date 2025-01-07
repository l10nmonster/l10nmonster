import { L10nContext } from '@l10nmonster/core';

export class ResourceHandle {
    #formatHandler;

    constructor({ id, channel, modified, resourceFormat, formatHandler, sourceLang, targetLangs, prj, raw, segments, subresources, ...other }) {
        this.id = id;
        this.channel = channel;
        this.modified = modified;
        this.resourceFormat = resourceFormat;
        this.#formatHandler = formatHandler;
        this.sourceLang = sourceLang;
        this.targetLangs = targetLangs;
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

    async loadResourceFromRaw(rawResource, { isSource, keepRaw } = {}) {
        const normalizedResource = await this.#formatHandler.getNormalizedResource(this.id, rawResource, isSource);
        keepRaw && (this.raw = rawResource);
        return this.loadFromNormalizedResource(normalizedResource);
    }

    async generateTranslatedRawResource(tm) {
        return this.#formatHandler.generateTranslatedResource(this, tm);
    }
}
