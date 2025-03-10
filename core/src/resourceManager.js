import { L10nContext } from '@l10nmonster/core';

export default class ResourceManager {
    #channels;

    constructor({ channels, snapStore }) {
        this.#channels = channels;
        this.snapStore = snapStore;
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        Object.values(this.#channels).forEach(ch => ch.init(mm));
    }

    /**
     * Returns a channel given its id.
     *
     * @param {string} channelId String identifier of the channel.
     * @return {Object} A channel object.
     */
    getChannel(channelId) {
        const channel = this.#channels[channelId];
        if (!channel) {
            throw `Invalid channel reference: ${channelId}`;
        }
        return channel;
    }

    //
    // Snap store internal helpers
    //

    async #getResourceHandlesFromSnapStore() {
        const stats = await this.snapStore.getResourceStats();
        return stats.map(rs => this.getChannel(rs.channel).makeResourceHandleFromObject(rs));
    }

    async *#getAllResourcesFromSnapStore(options) {
        L10nContext.logger.info(`Getting all resources from snap store...`);
        const allResources = await this.snapStore.getAllResources(options);
        for await (const normalizedResource of allResources) {
            const handle = this.getChannel(normalizedResource.channel).makeResourceHandleFromObject(normalizedResource);
            yield handle.loadFromNormalizedResource(normalizedResource);
        }
    }

    //
    // Channel internal helpers
    //

    async #getResourceHandlesFromAllChannels() {
        L10nContext.logger.info(`Getting resource stats from all sources...`);
        const combinedHandles = [];
        for (const channel of Object.values(this.#channels)) {
            const handles = await channel.getResourceHandles();
            combinedHandles.push(handles);
        }
        return combinedHandles
            .flat(1)
            .filter(e => (L10nContext.prj === undefined || L10nContext.prj.includes(e.prj)));
    }

    async *#getAllResourcesFromSources(options) {
        L10nContext.logger.info(`Getting all resources directly from sources...`);
        for (const channel of Object.values(this.#channels)) {
            const channelResources = await channel.getAllNormalizedResources(options);
            for await (const normalizedResource of channelResources) {
                yield normalizedResource;
            }
        }
    }

    //
    // Public API
    //

    async getResourceHandles() {
        return this.snapStore ? this.#getResourceHandlesFromSnapStore() : this.#getResourceHandlesFromAllChannels();
    }

    async *getAllResources(options = {}) {
        const ignoreSnapStore = options.ignoreSnapStore || options.keepRaw; // TODO: make snap stores optionally store raw as well
        return this.snapStore && !ignoreSnapStore ? yield* this.#getAllResourcesFromSnapStore(options) : yield* this.#getAllResourcesFromSources(options);
    }

    async getResource(resourceHandle, options = {}) {
        return this.snapStore ?
            resourceHandle.loadFromNormalizedResource(await this.snapStore.getResource(resourceHandle)) :
            this.getChannel(resourceHandle.channel).loadResource(resourceHandle, options);
    }

    async shutdown() {
    }
}
