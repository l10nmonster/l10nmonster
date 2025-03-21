import { L10nContext } from '@l10nmonster/core';
import { ResourceHandle } from './resourceHandle.js';

export class Channel {
    #id;
    #source;
    #formatHandlers;
    #defaultResourceFormat;
    #defaultSourceLang;
    #target;

    constructor({ id, source, formatHandlers, defaultResourceFormat, target }) {
        this.#id = id;
        this.#source = source;
        this.#formatHandlers = formatHandlers;
        this.#defaultResourceFormat = defaultResourceFormat;
        this.#target = target;
    }

    async init(mm) {
        this.#defaultSourceLang = mm.sourceLang;
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
            targetLangs: [],
            ...obj,
        });
    }

    async getResourceHandles() {
        const resStats = await this.#source.fetchResourceStats();
        L10nContext.logger.verbose(`Fetched resource handles for channel ${this.#id}`);
        return resStats.map(rs => this.makeResourceHandleFromObject(rs));
    }

    async *getAllNormalizedResources() {
        if (this.#source.fetchAllResources) {
            for await (const [resourceStat, rawResource] of this.#source.fetchAllResources(L10nContext.prj)) {
                const handle = this.makeResourceHandleFromObject(resourceStat);
                yield handle.loadResourceFromRaw(rawResource, { isSource: true });
            }
        } else {
            const resourceStats = await this.#source.fetchResourceStats();
            for (const resourceStat of resourceStats) {
                if (L10nContext.prj === undefined || L10nContext.prj.includes(resourceStat.prj)) {
                    const handle = this.makeResourceHandleFromObject(resourceStat);
                    const rawResource = await this.#source.fetchResource(resourceStat.id);
                    yield handle.loadResourceFromRaw(rawResource, { isSource: true });
                }
            }
        }
    }

    // async loadResource(resourceHandle) {
    //     const rawResource = await this.#source.fetchResource(resourceHandle.id);
    //     return resourceHandle.loadResourceFromRaw(rawResource, { isSource: true });
    // }

    async getExistingTranslatedResource(resourceHandle, targetLang) {
        const rawResource = await this.#target.fetchTranslatedResource(targetLang, resourceHandle.id);
        const translatedResource = this.makeResourceHandleFromObject(resourceHandle);
        return translatedResource.loadResourceFromRaw(rawResource, { isSource: false });
    }

    async commitTranslatedResource(targetLang, resourceId, rawResource) {
        const translatedResourceId = this.#target.translatedResourceId(targetLang, resourceId);
        await this.#target.commitTranslatedResource(targetLang, resourceId, rawResource);
        return translatedResourceId;
    }

}
