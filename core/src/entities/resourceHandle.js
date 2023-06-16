export class ResourceHandle {
    #formatHandler;

    constructor({ id, channel, modified, resourceFormat, formatHandler, sourceLang, targetLangs, prj, ...other }) {
        this.id = id;
        this.channel = channel;
        this.modified = modified;
        this.resourceFormat = resourceFormat;
        this.#formatHandler = formatHandler;
        this.sourceLang = sourceLang;
        this.targetLangs = targetLangs;
        this.prj = prj;
        if (Object.keys(other).length > 1) {
            l10nmonster.logger.verbose(`Unknown properties in resource handle: ${Object.keys(other).join(', ')}`);
        }
    }

    loadFromNormalizedResource(normalizedResource) {
        const { segments } = normalizedResource;
        this.segments = segments;
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
