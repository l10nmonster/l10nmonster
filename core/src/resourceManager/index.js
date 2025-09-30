import { logInfo, logVerbose } from '../l10nContext.js';

export default class ResourceManager {
    #autoSnap = {};
    #channels;
    #DAL;
    #snapStores;

    constructor(dal, { channels, autoSnap, snapStores }) {
        this.#DAL = dal;
        this.#channels = channels;
        this.#autoSnap = autoSnap && Object.fromEntries(Object.keys(channels).map((id) => [ id, true ]));
        this.#snapStores = snapStores ?? {};
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        // Object.values(this.#channels).forEach(ch => ch.init(mm));
    }

    async #snapIfNecessary(channelId) {
        if (!this.#channels[channelId]) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }
        if (this.#autoSnap[channelId]) {
            await this.snap(channelId);
            this.#autoSnap[channelId] = false; // for now it's just a boolean but it could be a maxAge
        }
    }

    get channelIds() {
        return Object.keys(this.#channels);
    }

    async getChannelMeta(channelId) {
        return (await this.#DAL.channel(channelId).getChannelMeta()) ?? {};
    }

    get snapStoreIds() {
        return Object.keys(this.#snapStores);
    }

    getSnapStoreInfo(snapStoreId) {
        const snapStore = this.#snapStores[snapStoreId];
        return {
            id: snapStore.id,
            type: snapStore.constructor.name,
        };
    }

    async getSnapStoreTOC(snapStoreId) {
        return this.#snapStores[snapStoreId].getTOC();
    }

    /**
     * Returns a channel given its id.
     *
     * @param {string} channelId String identifier of the channel.
     * @return {import('@l10nmonster/core').Channel} A channel object.
     */
    getChannel(channelId) {
        const channel = this.#channels[channelId];
        if (!channel) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }
        return channel;
    }

    async getDesiredLangPairs(channelId) {
        await this.#snapIfNecessary(channelId);
        return await this.#DAL.channel(channelId).getDesiredLangPairs();
    }

    /**
     * @param {Array | string} limitToLang Language or list of languages to limit to
     */
    async getDesiredTargetLangs(channelId, limitToLang = []) {
        const desiredTargetLangs = new Set((await this.getDesiredLangPairs(channelId)).map(pair => pair[1]));
        const langsToLimit = Array.isArray(limitToLang) ? limitToLang : limitToLang.split(',');
        langsToLimit.forEach(limitedLang => {
            if (!desiredTargetLangs.has(limitedLang)) {
                throw new Error(`Invalid language: ${limitedLang}`);
            }
        });
        return [ ...desiredTargetLangs ].filter(lang => limitToLang.length === 0 || langsToLimit.includes(lang)).sort();
    }    

    async getActiveContentStats(channelId) {
        await this.#snapIfNecessary(channelId);
        const stats = await this.#DAL.channel(channelId).getActiveContentStats(channelId);
        return stats.map(stats => ({ ...stats, targetLangs: stats.targetLangs ? stats.targetLangs.split(',') : [] }));
    }

    async getProjectTOC(channelId, prj, offset = 0, limit = 1000) {
        await this.#snapIfNecessary(channelId);
        return await this.#DAL.channel(channelId).getProjectTOC(prj, offset, limit);
    }

    //
    // Public API
    //

    async getResourceHandle(channelId, rid, options = { keepRaw: false }) {
        await this.#snapIfNecessary(channelId);
        const resourceHeader = await this.#DAL.channel(channelId).getResource(rid, options);
        return this.getChannel(resourceHeader.channel).makeResourceHandleFromHeader(resourceHeader);
    }

    async *getAllResources(channelId, options = { keepRaw: false, prj: undefined }) {
        await this.#snapIfNecessary(channelId);
        logInfo`Getting all resources from cache...`;
        let resourceCount = 0;
        for await (const resourceHeader of this.#DAL.channel(channelId).getAllResources(options)) {
            const handle = this.getChannel(resourceHeader.channel).makeResourceHandleFromHeader(resourceHeader);
            yield handle.loadFromNormalizedResource(resourceHeader);
            resourceCount++;
        }
        logInfo`Got ${resourceCount.toLocaleString()} ${[resourceCount, 'resource', 'resources']}`;
    }

    /**
     * @param {string} channelId
     * @returns {Promise<{resources: number, segments: number}>}
     */
    async snap(channelId) {
        const ts = Date.now();
        logInfo`Starting snapshot of all resources (channel: ${channelId})...`;
        const channel = this.getChannel(channelId);
        const channelResources = await channel.getAllNormalizedResources();
        
        const stats = await this.#DAL.channel(channelId).saveChannel({ ts }, async ({saveResource}) => {
            for await (const res of channelResources) {
                saveResource(res);
            }
        });
        logInfo`${stats.resources.toLocaleString()} ${[stats.resources, 'resource', 'resources']} and ${stats.segments.toLocaleString()} ${[stats.segments, 'segment', 'segments']} snapped from channel ${channelId} at ${ts}`;
        return stats;
    }

    /**
     * @param {number} ts
     * @param {string} channelId
     * @param {string} snapStoreId
     * @returns {Promise<{resources: number, segments: number}>}
     */
    async import(ts, channelId, snapStoreId) {
        const snapStore = this.#snapStores[snapStoreId];
        if (!snapStore) {
            throw new Error(`ResourceManager(import): Invalid snap store reference: ${snapStoreId}`);
        }
        const resourceRows = await snapStore.generateRows(ts, channelId, 'resources');
        const segmentRows = await snapStore.generateRows(ts, channelId, 'segments');
        const insertRows = async (rows, insertRow) => {
            for await (const row of rows) {
                insertRow(row);
            }
        };

        const stats = await this.#DAL.channel(channelId).saveChannel({ ts, store: snapStoreId }, async ({insertResourceRow, insertSegmentRow}) => {
            await Promise.all([
                insertRows(resourceRows, insertResourceRow),
                insertRows(segmentRows, insertSegmentRow),
            ]);
        });
        logInfo`${stats.resources.toLocaleString()} ${[stats.resources, 'resource', 'resources']} and ${stats.segments.toLocaleString()} ${[stats.segments, 'segment', 'segments']} snapped from channel ${channelId} at ${ts}`;
        return stats;
    }

    /**
     * @param {string} channelId
     * @param {string} snapStoreId
     * @returns {Promise<{ts?: number, resources?: any, segments?: any}>}
     */
    async export(channelId, snapStoreId) {
        await this.#snapIfNecessary(channelId);
        const { ts } = await this.getChannelMeta(channelId);
        if (!ts) {
            logVerbose`Channel ${channelId} has no snapshot, skipping export`;
            return {};
        }
        const snapStore = this.#snapStores[snapStoreId];
        const toc = await snapStore.getTOC();
        if (toc[channelId]?.includes(ts)) {
            logVerbose`Channel ${channelId} already exported to ${snapStoreId} with ts=${ts}, skipping export`;
            return {};
        }
        const resources = await snapStore.saveSnap(ts, channelId, this.#DAL.channel(channelId).getResourceRowIterator(channelId), 'resources');
        const segments = await snapStore.saveSnap(ts, channelId, this.#DAL.channel(channelId).getSegmentRowIterator(channelId), 'segments');
        return { ts, resources, segments };
    }

    async shutdown() {
    }
}
