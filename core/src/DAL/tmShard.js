import * as fs from 'fs/promises';
import Database from 'better-sqlite3';
import { logVerbose } from '../l10nContext.js';
import { TuDAL } from './tu.js';
import { JobDAL } from './job.js';

/**
 * Handles all TM operations for a single shard.
 * This class is designed to be moved to a worker thread in the future.
 * For now, it runs in the main thread and is called directly.
 * Later, calls will be replaced with message passing.
 */
export class TmShard {
    #db;
    #shardIndex;
    #dbFilename;
    #sourceDBName;
    #jobDAL;
    #tuDALCache = new Map();
    #bootstrapMode = false;

    /**
     * @param {number} shardIndex - The shard index (0 = default)
     * @param {string} dbFilename - Database filename (':memory:' for in-memory)
     * @param {string} [sourceDBName] - Source DB name for ATTACH (if different from TM DB)
     */
    constructor(shardIndex, dbFilename, sourceDBName) {
        this.#shardIndex = shardIndex;
        this.#dbFilename = dbFilename;
        this.#sourceDBName = sourceDBName;
    }

    /**
     * Initialize the database connection and tables.
     * In worker mode, this will be called when the worker starts.
     */
    init() {
        this.#db = new Database(this.#dbFilename);
        const journalMode = this.#bootstrapMode ? 'MEMORY' : 'WAL';
        this.#db.pragma(`journal_mode = ${journalMode}`);
        logVerbose`Set journal_mode to ${this.#db.pragma('journal_mode', { simple: true })}`;
        this.#db.pragma('synchronous = OFF');
        this.#db.pragma('temp_store = MEMORY');
        this.#db.pragma('cache_size = -500000');
        this.#db.pragma('threads = 4');

        // Attach source DB if different
        if (this.#sourceDBName) {
            this.#db.prepare('ATTACH ? as source;').run(this.#sourceDBName);
        }

        const version = this.#db.prepare('select sqlite_version();').pluck().get();
        logVerbose`Initialized TM DB shard ${this.#shardIndex} (${this.#dbFilename}) with sqlite version ${version}`;

        // JobDAL creates the jobs table and provides query methods
        // All shards need the jobs table because TuDAL.saveJobs writes to it
        // Only shard 0 exposes the jobDAL for querying (single source of truth for job metadata)
        const jobDAL = new JobDAL(this.#db);
        if (this.#shardIndex === 0) {
            this.#jobDAL = jobDAL;
        }
    }

    /**
     * Get TuDAL for a language pair.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @param {import('./index.js').default} dalManager - Parent DAL manager (for job lookups)
     * @returns {TuDAL}
     */
    getTuDAL(sourceLang, targetLang, dalManager) {
        const pairKey = `${sourceLang}#${targetLang}`;
        if (!this.#tuDALCache.has(pairKey)) {
            this.#tuDALCache.set(pairKey, new TuDAL(this.#db, sourceLang, targetLang, dalManager));
        }
        return this.#tuDALCache.get(pairKey);
    }

    /**
     * Get JobDAL (only available in shard 0).
     * @returns {JobDAL | undefined}
     */
    get jobDAL() {
        return this.#jobDAL;
    }

    /**
     * Runs a callback in bootstrap mode with optimal bulk insert settings.
     * Automatically cleans up and switches back to normal WAL mode when done.
     *
     * @template T
     * @param {() => Promise<T>} callback - The bootstrap operation to run.
     * @returns {Promise<T>} The result of the callback.
     */
    async withBootstrapMode(callback) {
        // Close existing connection
        if (this.#db) {
            this.#db.close();
            this.#db = null;
        }
        // Delete TM database files
        if (this.#dbFilename !== ':memory:') {
            await fs.unlink(this.#dbFilename).catch(() => {});
            await fs.unlink(`${this.#dbFilename}-wal`).catch(() => {});
            await fs.unlink(`${this.#dbFilename}-shm`).catch(() => {});
        }
        this.#tuDALCache.clear();
        this.#jobDAL = null;

        // Set bootstrap mode BEFORE init so it uses MEMORY journal
        this.#bootstrapMode = true;
        this.init();

        try {
            return await callback();
        } finally {
            // Switch to WAL mode (MEMORY -> WAL should work without locking issues)
            this.#db.pragma('journal_mode = WAL');
            logVerbose`Set journal_mode to ${this.#db.pragma('journal_mode', { simple: true })}`;
            this.#bootstrapMode = false;
        }
    }

    /**
     * Shutdown the database connection.
     */
    shutdown() {
        if (this.#db) {
            this.#db.close();
            this.#db = null;
        }
    }
}
