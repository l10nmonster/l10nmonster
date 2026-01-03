import { logInfo, logVerbose } from '../l10nContext.js';

/**
 * @typedef {import('../../index.js').Channel} Channel
 * @typedef {import('../../index.js').ResourceHandle} ResourceHandle
 * @typedef {import('../../index.js').SnapStore} SnapStore
 * @typedef {import('../../index.js').DALManager} DALManager
 */

/**
 * ResourceManager constructor options.
 * @typedef {Object} ResourceManagerConstructorOptions
 * @property {Object<string, Channel>} [channels] - Map of channel ID to Channel instance.
 * @property {boolean} [autoSnap] - Whether to automatically snapshot channels on first access.
 * @property {Object<string, SnapStore>} [snapStores] - Map of snap store ID to SnapStore instance.
 */

/**
 * Channel metadata.
 * @typedef {Object} ChannelMeta
 * @property {number} [ts] - Timestamp of the last snapshot.
 * @property {string} [store] - Snap store ID if imported from external store.
 */

/**
 * Snapshot statistics.
 * @typedef {Object} SnapStats
 * @property {number} resources - Number of resources snapped.
 * @property {number} segments - Number of segments snapped.
 */

/**
 * Active content statistics for a project/language pair.
 * @typedef {Object} ActiveContentStats
 * @property {string} prj - Project name.
 * @property {string} sourceLang - Source language code.
 * @property {string[]} targetLangs - Target languages for this resource.
 * @property {number} segmentCount - Number of segments.
 * @property {number} resCount - Number of resources.
 * @property {string} lastModified - Last modification timestamp.
 */

/**
 * Snap store information.
 * @typedef {Object} SnapStoreInfo
 * @property {string} id - Snap store identifier.
 * @property {string} type - Snap store class name.
 */

/**
 * Manages localization resources, channels, and snapshots.
 * Provides methods for fetching, caching, and exporting resource content.
 */
export default class ResourceManager {
    #autoSnap = {};
    #channels;
    #DAL;
    #snapStores;

    /**
     * Creates a new ResourceManager instance.
     * @param {DALManager} dal - Data Access Layer manager for database operations.
     * @param {ResourceManagerConstructorOptions} options - Constructor options.
     */
    constructor(dal, { channels, autoSnap, snapStores }) {
        this.#DAL = dal;
        this.#channels = channels;
        this.#autoSnap = autoSnap && Object.fromEntries(Object.keys(channels).map((id) => [ id, true ]));
        this.#snapStores = snapStores ?? {};
    }

    /**
     * Initializes the ResourceManager.
     * @param {import('../monsterManager/index.js').MonsterManager} mm - The MonsterManager instance.
     * @returns {Promise<void>}
     */
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

    /**
     * Gets the list of configured channel IDs.
     * @returns {string[]} Array of channel identifiers.
     */
    get channelIds() {
        return Object.keys(this.#channels);
    }

    /**
     * Gets metadata for a channel (timestamp, store info).
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<import('../interfaces.js').ChannelTocRow | undefined>} Channel metadata object or undefined.
     */
    async getChannelMeta(channelId) {
        return (await this.#DAL.channel(channelId).getChannelMeta()) ?? undefined;
    }

    /**
     * Gets the list of configured snap store IDs.
     * @returns {string[]} Array of snap store identifiers.
     */
    get snapStoreIds() {
        return Object.keys(this.#snapStores);
    }

    /**
     * Gets information about a snap store.
     * @param {string} snapStoreId - Snap store identifier.
     * @returns {SnapStoreInfo} Snap store information.
     */
    getSnapStoreInfo(snapStoreId) {
        const snapStore = this.#snapStores[snapStoreId];
        if (!snapStore) {
            throw new Error(`Invalid snap store reference: ${snapStoreId}. Available: ${Object.keys(this.#snapStores).join(', ') || 'none'}`);
        }
        return {
            id: snapStore.id,
            type: snapStore.constructor.name,
        };
    }

    /**
     * Gets the table of contents for a snap store.
     * @param {string} snapStoreId - Snap store identifier.
     * @returns {Promise<Object>} Table of contents with channel snapshots.
     */
    async getSnapStoreTOC(snapStoreId) {
        const snapStore = this.#snapStores[snapStoreId];
        if (!snapStore) {
            throw new Error(`Invalid snap store reference: ${snapStoreId}. Available: ${Object.keys(this.#snapStores).join(', ') || 'none'}`);
        }
        return snapStore.getTOC();
    }

    /**
     * Returns a channel given its id.
     *
     * @param {string} channelId String identifier of the channel.
     * @return {Channel} A channel object.
     */
    getChannel(channelId) {
        const channel = this.#channels[channelId];
        if (!channel) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }
        return channel;
    }

    /**
     * Gets all desired language pairs for a channel based on translation policies.
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<Array<[string, string]>>} Array of [sourceLang, targetLang] pairs.
     */
    async getDesiredLangPairs(channelId) {
        await this.#snapIfNecessary(channelId);
        return this.#DAL.channel(channelId).getDesiredLangPairs();
    }

    /**
     * Gets desired target languages for a channel, optionally filtered.
     * @param {string} channelId - Channel identifier.
     * @param {string[]|string} [limitToLang] - Language or list of languages to limit to.
     * @returns {Promise<string[]>} Sorted array of target language codes.
     * @throws {Error} If any specified language is not in the desired list.
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

    /**
     * Gets statistics about active content in a channel.
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<ActiveContentStats[]>} Array of content statistics per resource.
     */
    async getActiveContentStats(channelId) {
        await this.#snapIfNecessary(channelId);
        const stats = await this.#DAL.channel(channelId).getActiveContentStats();
        return stats.map(s => ({ ...s, targetLangs: s.targetLangs ? s.targetLangs.split(',') : [] }));
    }

    /**
     * Gets paginated table of contents for a project within a channel.
     * @param {string} channelId - Channel identifier.
     * @param {string} prj - Project name.
     * @param {number} [offset=0] - Pagination offset.
     * @param {number} [limit=1000] - Maximum number of results.
     * @returns {Promise<Object[]>} Array of resource entries.
     */
    async getProjectTOC(channelId, prj, offset = 0, limit = 1000) {
        await this.#snapIfNecessary(channelId);
        return this.#DAL.channel(channelId).getProjectTOC(prj, offset, limit);
    }

    //
    // Public API
    //

    /**
     * Gets a resource handle by ID from the cached snapshot.
     * @param {string} channelId - Channel identifier.
     * @param {string} rid - Resource identifier.
     * @param {Object} [options] - Options for fetching the resource.
     * @param {boolean} [options.keepRaw=false] - Whether to include raw content.
     * @returns {Promise<ResourceHandle>} The resource handle.
     */
    async getResourceHandle(channelId, rid, options = { keepRaw: false }) {
        await this.#snapIfNecessary(channelId);
        const resourceHeader = await this.#DAL.channel(channelId).getResource(rid, options);
        return this.getChannel(resourceHeader.channel).makeResourceHandleFromHeader(resourceHeader);
    }

    /**
     * Iterates over all resources in a channel from the cached snapshot.
     * @param {string} channelId - Channel identifier.
     * @param {Object} [options] - Options for fetching resources.
     * @param {boolean} [options.keepRaw=false] - Whether to include raw content.
     * @param {string} [options.prj] - Filter by project name.
     * @yields {ResourceHandle} Resource handles.
     * @returns {AsyncGenerator<ResourceHandle>} Async generator of resource handles.
     */
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
     * Exports a channel snapshot to an external snap store.
     * @param {string} channelId - Channel identifier.
     * @param {string} snapStoreId - Snap store identifier.
     * @returns {Promise<{ts?: number, resources?: number, segments?: number}>} Export stats.
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
        const resources = await snapStore.saveSnap(ts, channelId, this.#DAL.channel(channelId).getResourceRowIterator(), 'resources');
        const segments = await snapStore.saveSnap(ts, channelId, this.#DAL.channel(channelId).getSegmentRowIterator(), 'segments');
        return { ts, resources: resources?.count, segments: segments?.count };
    }

    /**
     * Cleans up resources on shutdown.
     * @returns {Promise<void>}
     */
    async shutdown() {
    }
}
