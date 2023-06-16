import { ResourceHandle } from './resourceHandle.js';

export class Channel {
    #id;
    #source;
    #formatHandlers;
    #defaultResourceFormat;
    #defaultSourceLang;
    #target;

    constructor({ id, source, formatHandlers, defaultResourceFormat, defaultSourceLang, target }) {
        this.#id = id;
        this.#source = source;
        this.#formatHandlers = formatHandlers;
        this.#defaultResourceFormat = defaultResourceFormat;
        this.#defaultSourceLang = defaultSourceLang;
        this.#target = target;
    }

    makeResourceHandleFromObject(obj) {
         // sources can provide resources of different formats but we have a default
        const resourceFormat = obj.resourceFormat ?? this.#defaultResourceFormat;
        const formatHandler = this.#formatHandlers[resourceFormat];
        return new ResourceHandle({
            channel: this.#id,
            resourceFormat: this.#defaultResourceFormat,
            formatHandler,
            sourceLang: this.#defaultSourceLang, // can be overriden but here's the default
            ...obj,
        });
    }

    async getResourceHandles() {
        const resStats = await this.#source.fetchResourceStats();
        l10nmonster.logger.verbose(`Fetched resource handles for channel ${this.#id}`);
        return resStats.map(rs => this.makeResourceHandleFromObject(rs));
    }

    async *getAllNormalizedResources({ keepRaw } = {}) {
        if (this.#source.fetchAllResources) {
            for await (const [resourceStat, rawResource] of this.#source.fetchAllResources(l10nmonster.prj)) {
                const handle = this.makeResourceHandleFromObject(resourceStat);
                yield handle.loadResourceFromRaw(rawResource, { isSource: true, keepRaw });
            }
        } else {
            const resourceStats = await this.#source.fetchResourceStats();
            for (const resourceStat of resourceStats) {
                if (l10nmonster.prj === undefined || l10nmonster.prj.includes(resourceStat.prj)) {
                    const handle = this.makeResourceHandleFromObject(resourceStat);
                    const rawResource = await this.#source.fetchResource(resourceStat.id);
                    yield handle.loadResourceFromRaw(rawResource, { isSource: true, keepRaw });
                }
            }
        }
    }

    async loadResource(resourceHandle, { keepRaw } = {}) {
        const rawResource = await this.#source.fetchResource(resourceHandle.id);
        return resourceHandle.loadResourceFromRaw(rawResource, { isSource: true, keepRaw });
    }

    async getExistingTranslatedResource(resourceHandle, targetLang, { keepRaw } = {}) {
        const rawResource = await this.#target.fetchTranslatedResource(targetLang, resourceHandle.id);
        const translatedResource = this.makeResourceHandleFromObject(resourceHandle);
        return translatedResource.loadResourceFromRaw(rawResource, { isSource: false, keepRaw });
    }

    async commitTranslatedResource(targetLang, resourceId, rawResource) {
        const translatedResourceId = this.#target.translatedResourceId(targetLang, resourceId);
        await this.#target.commitTranslatedResource(targetLang, resourceId, rawResource);
        return translatedResourceId;
    }

}
