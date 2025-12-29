import * as fs from 'fs/promises';
import Database from 'better-sqlite3';
import { logVerbose } from '../l10nContext.js';
import { TuDAL } from './tu.js';

/**
 * Handles all TM operations for a single shard.
 * This class is designed to be moved to a worker thread in the future.
 * For now, it runs in the main thread and is called directly.
 * Later, calls will be replaced with message passing.
 *
 * Each TuDAL instance manages both TUs and jobs for its language pair.
 * Jobs table is shared within the shard, but queries are scoped by language pair.
 */
export class TmShard {
    #db;
    #shardIndex;
    #dbFilename;
    #sourceDBName;
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
     * Get the cache of TuDAL instances for this shard.
     * Used by SQLiteDALManager for cross-shard aggregation.
     * @returns {Map<string, TuDAL>}
     */
    get tuDALCache() {
        return this.#tuDALCache;
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
     * Initialize the shard in bootstrap mode with optimal bulk insert settings.
     * Deletes existing DB files, sets MEMORY journal mode, and clears cache.
     * Call finalizeBootstrap() when done to switch to WAL mode.
     */
    async initBootstrap() {
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

        // Set bootstrap mode BEFORE init so it uses MEMORY journal
        this.#bootstrapMode = true;
        this.init();
    }

    /**
     * Finalize bootstrap mode by switching to WAL journal mode.
     * Call this after initBootstrap() and bulk operations are complete.
     */
    finalizeBootstrap() {
        // Switch to WAL mode (MEMORY -> WAL should work without locking issues)
        this.#db.pragma('journal_mode = WAL');
        logVerbose`Set journal_mode to ${this.#db.pragma('journal_mode', { simple: true })}`;
        this.#bootstrapMode = false;
    }

    /**
     * Get all available language pairs in this shard by querying the jobs table.
     * @param {import('./index.js').default} dalManager - Parent DAL manager.
     * @returns {Array<[string, string]>} Array of [sourceLang, targetLang] tuples.
     */
    getAvailableLangPairs(dalManager) {
        // Check if jobs table exists
        const tableExists = this.#db.prepare(/* sql */`
            SELECT name FROM sqlite_master WHERE type='table' AND name='jobs';
        `).get();
        if (!tableExists) {
            return [];
        }

        const rows = this.#db.prepare(/* sql */`
            SELECT DISTINCT sourceLang, targetLang FROM jobs;
        `).all();

        // Initialize TuDALs for each pair found
        for (const { sourceLang, targetLang } of rows) {
            this.getTuDAL(sourceLang, targetLang, dalManager);
        }

        return rows.map(({ sourceLang, targetLang }) => [sourceLang, targetLang]);
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
