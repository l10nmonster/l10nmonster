// @ts-nocheck
import { logInfo } from '@l10nmonster/core';

export default class ResourceManager {
    channels;
    #DAL;
    #autoSnap;

    constructor(dal, { channels, autoSnap }) {
        this.#DAL = dal;
        this.channels = channels;
        this.#autoSnap = autoSnap;
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        Object.values(this.channels).forEach(ch => ch.init(mm));
    }

    async #snapIfNecessary() {
        if (this.#autoSnap) {
            await this.snap();
            this.#autoSnap = false; // for now it's just a boolean but it could be a maxAge
        }
    }

    /**
     * Returns a channel given its id.
     *
     * @param {string} channelId String identifier of the channel.
     * @return {Object} A channel object.
     */
    getChannel(channelId) {
        const channel = this.channels[channelId];
        if (!channel) {
            throw `Invalid channel reference: ${channelId}`;
        }
        return channel;
    }

    getChannelStats(channelId) {
        if (!this.channels[channelId]) {
            throw `Invalid channel reference: ${channelId}`;
        }
        return this.#DAL.source.getStats(channelId);
    }

    //
    // Snap store internal helpers
    //

    // async *#getAllResourcesFromSnapStore(options) {
    //     logInfo`Getting all resources from snap store...`;
    //     const allResources = await this.snapStore.getAllResources(options);
    //     for await (const normalizedResource of allResources) {
    //         const handle = this.getChannel(normalizedResource.channel).makeResourceHandleFromObject(normalizedResource);
    //         yield handle.loadFromNormalizedResource(normalizedResource);
    //     }
    // }

    //
    // Channel internal helpers
    //

    // TODO: this could be used for differential snaps (only snap if something changed) but it's unclear getting stats is fast enough to be worth it
    // async #getResourceHandlesFromAllChannels() {
    //     logInfo`Getting resource stats from all sources...`;
    //     const combinedHandles = [];
    //     for (const channel of Object.values(this.channels)) {
    //         const handles = await channel.getResourceHandles();
    //         combinedHandles.push(handles);
    //     }
    //     return combinedHandles
    //         .flat(1)
    //         .filter(e => (L10nContext.prj === undefined || L10nContext.prj.includes(e.prj)));
    // }

    async *#getAllResourcesFromSources(options = { channel: undefined }) {
        logInfo`Getting all resources directly from sources...`;
        const channels = options.channel ? [ this.getChannel(options.channel) ] : Object.values(this.channels);
        for (const channel of Object.values(channels)) {
            const channelResources = await channel.getAllNormalizedResources();
            for await (const normalizedResource of channelResources) {
                yield normalizedResource;
            }
        }
    }

    //
    // Public API
    //

    async getResourceHandles() {
        await this.#snapIfNecessary();
        const toc = await this.#DAL.source.getTOC();
        logInfo`Got a TOC with ${toc.length.toLocaleString()} ${[toc.length, 'entry', 'entries']}`;
        return toc.map(rs => this.getChannel(rs.channel).makeResourceHandleFromObject(rs));
    }

    async *getAllResources(options = { keepRaw: false, prj: undefined, channel: undefined }) {
        await this.#snapIfNecessary();
        logInfo`Getting all resources from cache...`;
        let resourceCount = 0;
        for (const normalizedResource of this.#DAL.source.getAllResources(options)) {
            const handle = this.getChannel(normalizedResource.channel).makeResourceHandleFromObject(normalizedResource);
            yield handle.loadFromNormalizedResource(normalizedResource);
            resourceCount++;
        }
        logInfo`Got ${resourceCount.toLocaleString()} ${[resourceCount, 'resource', 'resources']}`;
    }

    // async getResource(resourceHandle) {
    //     return this.snapStore ?
    //         resourceHandle.loadFromNormalizedResource(await this.snapStore.getResource(resourceHandle)) :
    //         this.getChannel(resourceHandle.channel).loadResource(resourceHandle);
    // }

    async snap() {
        const stats = {};
        logInfo`Starting snapshot of all resources...`;
        this.#DAL.source.markResourcesAsInactive();
        for await (const res of this.#getAllResourcesFromSources()) {
            const currentPrj = res.prj ?? 'default';
            stats[currentPrj] ??= { resources: 0, segments: 0, changes: 0 };
            stats[currentPrj].resources++;
            stats[currentPrj].segments += res.segments.length;
            stats[currentPrj].changes += this.#DAL.source.saveResource(res);
        }
        const { resources, segments, changes } = Object.values(stats).reduce(
            (totals, { resources, segments, changes }) => (
            { resources: totals.resources + resources, segments: totals.segments + segments, changes: totals.changes + changes }),
            { resources: 0, segments: 0, changes: 0 }
        );
        logInfo`${segments.toLocaleString()} ${[segments, 'segment', 'segments']} snapped in ${resources.toLocaleString()} ${[resources, 'resource', 'resources']}, ${changes.toLocaleString()} ${[segments, 'segment', 'segments']} updated`;
        return stats;
    }

    async shutdown() {
    }
}
