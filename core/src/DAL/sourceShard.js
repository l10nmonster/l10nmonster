import Database from 'better-sqlite3';
import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { ChannelDAL } from './channel.js';

/**
 * Handles all Source DB operations.
 * This class is designed to be moved to a worker thread in the future.
 * Not sharded (single DB), but follows the same pattern for consistency.
 */
export class SourceShard {
    #db;
    #dbFilename;
    #channelDALCache = new Map();

    /**
     * @param {string} dbFilename - Database filename (':memory:' for in-memory)
     */
    constructor(dbFilename) {
        this.#dbFilename = dbFilename;
    }

    /**
     * Initialize the database connection.
     */
    init() {
        this.#db = new Database(this.#dbFilename);
        this.#db.pragma('journal_mode = MEMORY');
        this.#db.pragma('synchronous = OFF');
        this.#db.pragma('temp_store = MEMORY');
        this.#db.pragma('cache_size = -100000');
        this.#db.pragma('threads = 4');
        const version = this.#db.prepare('select sqlite_version();').pluck().get();
        logVerbose`Initialized Source DB (${this.#dbFilename}) with sqlite version ${version}, journal_mode ${this.#db.pragma('journal_mode', { simple: true })}`;

        // Create channel_toc table
        // store -- id if channel populated from a store
        // ts -- milliseconds of last snap or ts of store used for importing
        this.#db.exec(/* sql */`
            CREATE TABLE IF NOT EXISTS channel_toc (
                channel TEXT NOT NULL,
                store TEXT,
                ts INTEGER,
                resources INTEGER,
                segments INTEGER,
                PRIMARY KEY (channel)
            ) WITHOUT ROWID;
        `);

        // Register custom functions
        this.#db.function(
            'flattenNormalizedSourceToOrdinal',
            { deterministic: true },
            nstr => {
                if (nstr === null || nstr === undefined) return null;
                const parsed = JSON.parse(nstr);
                if (!Array.isArray(parsed)) return null;
                return utils.flattenNormalizedSourceToOrdinal(parsed);
            }
        );
    }

    /**
     * Get the raw database connection.
     * Used for attaching to TM DB when source and TM are separate files.
     * @returns {Database}
     */
    get db() {
        return this.#db;
    }

    /**
     * Get ChannelDAL for a channel.
     * @param {string} channelId
     * @returns {import('../interfaces.js').ChannelDAL}
     */
    getChannelDAL(channelId) {
        if (!this.#channelDALCache.has(channelId)) {
            this.#channelDALCache.set(channelId, new ChannelDAL(this.#db, channelId));
        }
        return this.#channelDALCache.get(channelId);
    }

    /**
     * Shutdown the database connection.
     * Runs WAL checkpoint to consolidate -wal/-shm files before closing.
     */
    shutdown() {
        if (this.#db) {
            // Checkpoint WAL to consolidate files before closing
            try {
                this.#db.pragma('wal_checkpoint(TRUNCATE)');
            } catch {
                // Ignore checkpoint errors (e.g., if not in WAL mode)
            }
            this.#db.close();
            this.#db = null;
        }
    }
}
