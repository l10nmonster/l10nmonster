import * as path from 'path';
import { getBaseDir, logVerbose } from '../l10nContext.js';
import { SourceShard } from './sourceShard.js';
import { TmShard } from './tmShard.js';

/** @typedef {import('../interfaces.js').DALManager} DALManagerInterface */

/**
 * @typedef {Object} SQLiteDALManagerOptions
 * @property {string} [sourceFilename] - Source DB filename (undefined = in-memory)
 * @property {string} [tmFilename] - TM DB filename for shard 0 (undefined = in-memory)
 * @property {Array<Array<[string, string]>>} [tmSharding] - Shard assignments
 */

/** @implements {DALManagerInterface} */
export default class SQLiteDALManager {
    #sourceShard;
    #tmShards = new Map();
    #shardMap = new Map();
    #sourceDBFilename;
    #tmDBFilenames = new Map();
    activeChannels;

    /**
     * @param {SQLiteDALManagerOptions} [options]
     */
    constructor(options = {}) {
        const { sourceFilename, tmFilename, tmSharding } = options;

        // Validation: both or neither
        if ((sourceFilename === undefined) !== (tmFilename === undefined)) {
            throw new Error('Both sourceFilename and tmFilename must be defined, or neither');
        }

        // Validation: no sharding with in-memory
        if (tmSharding && sourceFilename === undefined) {
            throw new Error('tmSharding requires file-based databases (sourceFilename and tmFilename must be defined)');
        }

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

        logVerbose`SQLiteDALManager initialized with source: ${this.#sourceDBFilename}, TM shards: ${this.#tmDBFilenames.size}`;
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        this.activeChannels = new Set(mm.rm.channelIds);
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

    channel(channelId) {
        if (!this.activeChannels.has(channelId)) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }
        return this.#getSourceShard().getChannelDAL(channelId);
    }

    tu(sourceLang, targetLang) {
        // eslint-disable-next-line no-unused-vars
        const jobDAL = this.job; // need to make sure job DAL is initialized first because it's used by the TU DAL
        const shardIndex = this.#getShardIndex(sourceLang, targetLang);
        return this.#getTmShard(shardIndex).getTuDAL(sourceLang, targetLang, this);
    }

    get job() {
        // Jobs are always in TM shard 0
        return this.#getTmShard(0).jobDAL;
    }

    /**
     * Runs a callback in bootstrap mode with optimal bulk insert settings.
     * Automatically cleans up and switches back to normal WAL mode when done.
     * Note: This only bootstraps shard 0 currently.
     *
     * @template T
     * @param {() => Promise<T>} callback - The bootstrap operation to run.
     * @returns {Promise<T>} The result of the callback.
     */
    async withBootstrapMode(callback) {
        // Clear existing TM shards - they'll be recreated by the shard's bootstrap mode
        for (const shard of this.#tmShards.values()) {
            shard.shutdown();
        }
        this.#tmShards.clear();

        // Bootstrap shard 0
        const shard = this.#getTmShard(0);
        return shard.withBootstrapMode(callback);
    }

    async shutdown() {
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
