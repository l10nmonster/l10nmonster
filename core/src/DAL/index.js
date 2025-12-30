import * as path from 'path';
import { getBaseDir, logVerbose } from '../l10nContext.js';
import { SourceShard } from './sourceShard.js';
import { TmShard } from './tmShard.js';
import { WorkerManager } from './workerManager.js';
import { TuDALProxy } from './dalProxy.js';

/** @typedef {import('../interfaces.js').DALManager} DALManagerInterface */
/** @typedef {import('../interfaces.js').TuDAL} TuDAL */

/**
 * @typedef {Object} SQLiteDALManagerOptions
 * @property {string} [sourceFilename] - Source DB filename (undefined = in-memory)
 * @property {string} [tmFilename] - TM DB filename for shard 0 (undefined = in-memory)
 * @property {Array<Array<[string, string]>>} [tmSharding] - Shard assignments
 * @property {boolean} [useWorkers=false] - Use worker threads for DB operations
 */

/** @implements {DALManagerInterface} */
export default class SQLiteDALManager {
    #sourceShard;
    #tmShards = new Map();
    #shardMap = new Map();
    #sourceDBFilename;
    #tmDBFilenames = new Map();
    #useWorkers;
    #workerManager = null;
    #tuDALProxyCache = new Map();
    activeChannels;

    /**
     * @param {SQLiteDALManagerOptions} [options]
     */
    constructor(options = {}) {
        const { sourceFilename, tmFilename, tmSharding, useWorkers = false } = options;

        // Validation: both or neither
        if ((sourceFilename === undefined) !== (tmFilename === undefined)) {
            throw new Error('Both sourceFilename and tmFilename must be defined, or neither');
        }

        // Validation: no sharding with in-memory
        if (tmSharding && sourceFilename === undefined) {
            throw new Error('tmSharding requires file-based databases (sourceFilename and tmFilename must be defined)');
        }

        // Validation: no workers with in-memory
        if (useWorkers && sourceFilename === undefined) {
            throw new Error('useWorkers requires file-based databases (sourceFilename and tmFilename must be defined)');
        }

        this.#useWorkers = useWorkers;

        // Set filenames (undefined means in-memory)
        this.#sourceDBFilename = sourceFilename ?
            path.join(getBaseDir(), sourceFilename) :
            ':memory:';

        this.#tmDBFilenames.set(0, tmFilename ?
            path.join(getBaseDir(), tmFilename) :
            ':memory:');

        // Build shard map and filenames from tmSharding config
        if (tmSharding) {
            const ext = path.extname(tmFilename);
            const base = tmFilename.slice(0, -ext.length);

            tmSharding.forEach((pairs, index) => {
                const shardIndex = index + 1; // 1-based
                pairs.forEach(([src, tgt]) => {
                    this.#shardMap.set(`${src}#${tgt}`, shardIndex);
                });
                // e.g., "l10nmonsterTM.db" → "l10nmonsterTM_1.db"
                this.#tmDBFilenames.set(shardIndex, path.join(getBaseDir(), `${base}_${shardIndex}${ext}`));
            });
        }

        logVerbose`SQLiteDALManager initialized with source: ${this.#sourceDBFilename}, TM shards: ${this.#tmDBFilenames.size}, workers: ${this.#useWorkers}`;
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        this.activeChannels = new Set(mm.rm.channelIds);

        // Create WorkerManager if using workers
        if (this.#useWorkers) {
            this.#workerManager = new WorkerManager(
                {
                    sourceDBFilename: this.#sourceDBFilename,
                    tmDBFilenames: this.#tmDBFilenames,
                    shardMap: this.#shardMap,
                },
                this.activeChannels
            );
        }
    }

    #getSourceShard() {
        if (!this.#sourceShard) {
            this.#sourceShard = new SourceShard(this.#sourceDBFilename);
            this.#sourceShard.init();
        }
        return this.#sourceShard;
    }

    #getTmShard(shardIndex) {
        if (!this.#tmShards.has(shardIndex)) {
            const filename = this.#tmDBFilenames.get(shardIndex) ?? this.#tmDBFilenames.get(0);

            // Check if TM DB is same as source DB (single file mode)
            if (filename === this.#sourceDBFilename) {
                // For single-file mode, we need to use the same DB connection
                // Pass the source shard's db to the TM shard
                const shard = new TmShard(shardIndex, filename, null);
                shard.init();
                this.#tmShards.set(shardIndex, shard);
            } else {
                // Attach source DB to TM DB for cross-DB queries
                const sourceDBName = this.#sourceDBFilename !== ':memory:' ?
                    this.#getSourceShard().db.name :
                    null;
                const shard = new TmShard(shardIndex, filename, sourceDBName);
                shard.init();
                this.#tmShards.set(shardIndex, shard);
            }
        }
        return this.#tmShards.get(shardIndex);
    }

    #getShardIndex(sourceLang, targetLang) {
        return this.#shardMap.get(`${sourceLang}#${targetLang}`) ?? 0;
    }

    /**
     * Get ChannelDAL for a channel.
     * Always uses direct mode (no worker proxy) for channel operations.
     * @param {string} channelId - Channel identifier.
     * @returns {import('../interfaces.js').ChannelDAL} ChannelDAL instance.
     */
    channel(channelId) {
        if (!this.activeChannels.has(channelId)) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }

        return this.#getSourceShard().getChannelDAL(channelId);
    }

    /**
     * Get TuDAL for a language pair.
     * Note: In worker mode, returns a TuDALProxy that implements the TuDAL interface.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @returns {TuDAL} TuDAL or proxy (cast as TuDAL).
     */
    tu(sourceLang, targetLang) {
        const shardIndex = this.#getShardIndex(sourceLang, targetLang);

        if (this.#useWorkers) {
            // Return cached proxy or create new one
            const pairKey = `${sourceLang}#${targetLang}`;
            if (!this.#tuDALProxyCache.has(pairKey)) {
                this.#tuDALProxyCache.set(pairKey, new TuDALProxy(
                    this.#workerManager,
                    shardIndex,
                    sourceLang,
                    targetLang
                ));
            }
            // Cast to TuDAL - proxy implements the interface
            return /** @type {TuDAL} */ (this.#tuDALProxyCache.get(pairKey));
        }

        return this.#getTmShard(shardIndex).getTuDAL(sourceLang, targetLang, this);
    }

    // ========== Aggregation Methods (cross-shard queries) ==========

    /**
     * Get all TuDAL instances across all shards.
     * Ensures all shards are initialized and TuDALs are cached.
     * In worker mode, returns cached proxies (must call getAvailableLangPairs first).
     * @returns {Promise<TuDAL[]>} Array of TuDAL instances or proxies.
     */
    async #getAllTuDALs() {
        if (this.#useWorkers) {
            // In worker mode, return cached proxies
            // Note: getAvailableLangPairs must be called first to populate the cache
            return Array.from(this.#tuDALProxyCache.values());
        }

        // Direct mode: ensure all shards are initialized and TuDALs are cached
        for (const shardIndex of this.#tmDBFilenames.keys()) {
            const shard = this.#getTmShard(shardIndex);
            await shard.getAvailableLangPairs(this); // This initializes TuDALs for all pairs in the shard
        }

        const tuDALs = [];
        for (const shard of this.#tmShards.values()) {
            for (const tuDAL of shard.tuDALCache.values()) {
                tuDALs.push(tuDAL);
            }
        }
        return tuDALs;
    }

    /**
     * Get all available language pairs across all shards.
     * Queries the database directly for distinct language pairs with jobs.
     * @returns {Promise<Array<[string, string]>>} Array of [sourceLang, targetLang] tuples.
     */
    async getAvailableLangPairs() {

        /** @type {Array<[string, string]>} */
        const pairs = [];

        if (this.#useWorkers) {
            // In worker mode, query each shard worker via WorkerManager
            // For now, we need to spawn workers and query them
            // TODO: Implement getAvailableLangPairs in worker protocol
            // For now, fall back to direct mode for this query
            logVerbose`getAvailableLangPairs: falling back to direct mode for worker implementation`;
        }

        // Query each configured shard for available language pairs
        for (const shardIndex of this.#tmDBFilenames.keys()) {
            const shard = this.#getTmShard(shardIndex);
            const shardPairs = await shard.getAvailableLangPairs(this);
            // Create proxies for discovered pairs in worker mode
            if (this.#useWorkers) {
                for (const [sourceLang, targetLang] of shardPairs) {
                    const pairKey = `${sourceLang}#${targetLang}`;
                    if (!this.#tuDALProxyCache.has(pairKey)) {
                        this.#tuDALProxyCache.set(pairKey, new TuDALProxy(
                            this.#workerManager,
                            shardIndex,
                            sourceLang,
                            targetLang
                        ));
                    }
                }
            }
            pairs.push(...shardPairs);
        }
        return pairs;
    }

    /**
     * Get total job count across all shards and language pairs.
     * @returns {Promise<number>} Total job count.
     */
    async getJobCount() {
        let total = 0;
        for (const tuDAL of await this.#getAllTuDALs()) {
            total += await tuDAL.getJobCount();
        }
        return total;
    }

    /**
     * Get a job by its GUID, searching all shards.
     * @param {string} jobGuid - Job identifier.
     * @returns {Promise<Object|undefined>} Job with parsed props, or undefined.
     */
    async getJob(jobGuid) {
        for (const tuDAL of await this.#getAllTuDALs()) {
            const job = await tuDAL.getJob(jobGuid);
            if (job) return job;
        }
        return undefined;
    }

    /**
     * Get job statistics across all shards.
     * @returns {Promise<Array>} Array of statistics objects.
     */
    async getJobStats() {
        const stats = [];
        for (const tuDAL of await this.#getAllTuDALs()) {
            const tuStats = await tuDAL.getJobStats();
            stats.push(...tuStats);
        }
        return stats;
    }

    /**
     * Runs a callback in bootstrap mode with optimal bulk insert settings.
     * Automatically cleans up and switches back to normal WAL mode when done.
     * All shards are bootstrapped (cleaned and initialized with MEMORY journal).
     *
     * @template T
     * @param {() => Promise<T>} callback - The bootstrap operation to run.
     * @returns {Promise<T>} The result of the callback.
     */
    async withBootstrapMode(callback) {
        if (this.#useWorkers) {
            // Worker mode: coordinate bootstrap across workers
            return this.#workerManager.withBootstrapMode(callback);
        }

        // Direct mode: bootstrap locally
        // Clear existing TM shards - they'll be recreated in bootstrap mode
        for (const shard of this.#tmShards.values()) {
            shard.shutdown();
        }
        this.#tmShards.clear();

        // Bootstrap ALL configured shards (not just shard 0)
        const shardIndicesToBootstrap = Array.from(this.#tmDBFilenames.keys());
        const bootstrappedShards = [];

        for (const shardIndex of shardIndicesToBootstrap) {
            const shard = await this.#getTmShardForBootstrap(shardIndex);
            bootstrappedShards.push(shard);
        }

        try {
            return await callback();
        } finally {
            // Switch all shards to WAL mode
            for (const shard of bootstrappedShards) {
                shard.finalizeBootstrap();
            }
        }
    }

    /**
     * Get or create a TM shard in bootstrap mode.
     * @param {number} shardIndex
     * @returns {Promise<TmShard>}
     */
    async #getTmShardForBootstrap(shardIndex) {
        const filename = this.#tmDBFilenames.get(shardIndex) ?? this.#tmDBFilenames.get(0);

        // Check if TM DB is same as source DB (single file mode)
        const sourceDBName = (filename !== this.#sourceDBFilename && this.#sourceDBFilename !== ':memory:') ?
            this.#getSourceShard().db.name :
            null;

        const shard = new TmShard(shardIndex, filename, sourceDBName);
        await shard.initBootstrap(); // Initialize in bootstrap mode
        this.#tmShards.set(shardIndex, shard);
        return shard;
    }

    async shutdown() {
        // Shutdown worker manager if using workers
        if (this.#workerManager) {
            await this.#workerManager.shutdown();
            this.#workerManager = null;
        }

        // Clear proxy cache
        this.#tuDALProxyCache.clear();

        // Shutdown direct shards
        if (this.#sourceShard) {
            this.#sourceShard.shutdown();
            this.#sourceShard = null;
        }
        for (const shard of this.#tmShards.values()) {
            shard.shutdown();
        }
        this.#tmShards.clear();
    }
}

export function createSQLObjectTransformer(jsonProps, spreadingProps = []) {
    return {
        encode(obj) {
            for (const key of jsonProps) {
                if (Object.hasOwn(obj, key) && typeof obj[key] === 'object' && obj[key] !== null) {
                    obj[key] = JSON.stringify(obj[key]);
                }
            }
            return obj;
        },
        decode(obj) {
            Object.entries(obj).forEach(([ key, value]) => {
                if (value === null) {
                    delete obj[key];
                } else {
                    if (jsonProps.includes(key)) {
                        try {
                            const parsed = JSON.parse(value);
                            if (spreadingProps.includes(key) && typeof parsed === 'object') {
                                delete obj[key];
                                Object.assign(obj, parsed);
                            } else {
                                obj[key] = parsed;
                            }
                        } catch (e) {
                            throw new Error(`Failed to parse JSON for key ${key}: ${obj[key]} -- ${e.message}`);
                        }
                    }
                }
            });
            return obj;
        }
    };
}
