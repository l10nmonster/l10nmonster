// @ts-nocheck
import { logInfo } from '@l10nmonster/core';

export default class ResourceManager {
    autoSnap;
    channels;
    #DAL;

    constructor(dal, { channels, autoSnap }) {
        this.#DAL = dal;
        this.channels = channels;
        this.autoSnap = autoSnap;
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        // Object.values(this.channels).forEach(ch => ch.init(mm));
    }

    async #snapIfNecessary() {
        if (this.autoSnap) {
            await this.snap();
            this.autoSnap = false; // for now it's just a boolean but it could be a maxAge
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

    async getAvailableLangPairs() {
        await this.#snapIfNecessary();
        return this.#DAL.source.getAvailableLangPairs();
    }

    async getChannelStats(channelId) {
        if (!this.channels[channelId]) {
            throw `Invalid channel reference: ${channelId}`;
        }
        await this.#snapIfNecessary();
        return this.#DAL.source.getStats(channelId);
    }

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

    // async getResourceHandles() {
    //     await this.#snapIfNecessary();
    //     const toc = await this.#DAL.source.getTOC();
    //     logInfo`Got a TOC with ${toc.length.toLocaleString()} ${[toc.length, 'entry', 'entries']}`;
    //     return toc.map(rs => this.getChannel(rs.channel).makeResourceHandleFromHeader(rs));
    // }

    async getResourceHandle(rid) {
        await this.#snapIfNecessary();
        const resourceHeader = await this.#DAL.source.getResource(rid, { headerOnly: true });
        return this.getChannel(resourceHeader.channel).makeResourceHandleFromHeader(resourceHeader);
    }

    async *getAllResources(options = { keepRaw: false, prj: undefined, channel: undefined }) {
        await this.#snapIfNecessary();
        logInfo`Getting all resources from cache...`;
        let resourceCount = 0;
        for (const resourceHeader of this.#DAL.source.getAllResources(options)) {
            const handle = this.getChannel(resourceHeader.channel).makeResourceHandleFromHeader(resourceHeader);
            yield handle.loadFromNormalizedResource(resourceHeader);
            resourceCount++;
        }
        logInfo`Got ${resourceCount.toLocaleString()} ${[resourceCount, 'resource', 'resources']}`;
    }

    // async getResource(resourceHandle) {
    //     return resourceHandle.loadFromNormalizedResource(await this.snapStore.getResource(resourceHandle)) :
    //         this.getChannel(resourceHandle.channel).loadResource(resourceHandle);
    // }

    async snap() {
        const stats = {};
        logInfo`Starting snapshot of all resources...`;
        this.#DAL.source.markResourcesAsInactive();
        for await (const res of this.#getAllResourcesFromSources()) {
            const changes = this.#DAL.source.saveResource(res);
            const currentPrj = res.prj ?? 'default';
            stats[currentPrj] ??= { resources: 0, segments: 0, changes: 0 };
            stats[currentPrj].resources++;
            stats[currentPrj].segments += res.segments.length;
            stats[currentPrj].changes += changes;
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
