import pg from 'pg';
import { logVerbose } from '@l10nmonster/core';
import { PgChannelDAL } from './pgChannelDAL.js';
import { PgTuDAL } from './pgTuDAL.js';

const { Pool, types } = pg;

// Configure BIGINT (OID 20) to parse as JavaScript number instead of string.
// This matches SQLite behavior where timestamps are returned as numbers.
// Note: JavaScript numbers are safe up to 2^53-1 (9007199254740991), which is
// sufficient for timestamps in milliseconds until year 287396.
types.setTypeParser(20, (val) => (val === null ? null : Number(val)));

/**
 * @typedef {Object} PostgresConnectionOptions
 * @property {string} [host] - Database host (default: 'localhost')
 * @property {number} [port] - Database port (default: 5432)
 * @property {string} [database] - Database name (default: 'l10nmonster')
 * @property {string} [user] - Database user
 * @property {string} [password] - Database password
 */

/**
 * @typedef {Object} PostgresPoolOptions
 * @property {number} [min] - Minimum pool size (default: 2)
 * @property {number} [max] - Maximum pool size (default: 10)
 * @property {number} [idleTimeoutMillis] - Idle timeout in milliseconds (default: 30000)
 * @property {number} [connectionTimeoutMillis] - Connection timeout in milliseconds (default: 30000)
 * @property {number} [statement_timeout] - Statement timeout in milliseconds (default: 0)
 */

/**
 * @typedef {Object} PostgresDALManagerOptions
 * @property {string} [connectionString] - PostgreSQL connection string
 * @property {PostgresConnectionOptions} [connection] - Connection parameters (alternative to connectionString)
 * @property {PostgresPoolOptions} [pool] - Pool configuration
 * @property {boolean|Object} [ssl] - SSL configuration
 * @property {pg.Pool} [existingPool] - Pre-configured Pool instance (for GCP Cloud SQL integration)
 */

/** @typedef {import('@l10nmonster/core').DALManager} DALManager */

/**
 * PostgreSQL implementation of DALManager.
 * @implements {DALManager}
 */
export class PostgresDALManager {
    #pool;
    #ownsPool;
    #poolConfig;
    #channelDALCache = new Map();
    #tuDALCache = new Map();

    /** @type {Set<string>} */
    activeChannels;

    /**
     * Creates a new PostgresDALManager.
     * @param {PostgresDALManagerOptions} [options]
     */
    constructor(options = {}) {
        if (options.existingPool) {
            // GCP integration point: accept a pre-configured Pool
            this.#pool = options.existingPool;
            this.#ownsPool = false;
            this.#poolConfig = null;
        } else {
            this.#ownsPool = true;
            this.#poolConfig = {
                ssl: options.ssl,
                min: options.pool?.min ?? 4,
                max: options.pool?.max ?? 32,
                idleTimeoutMillis: options.pool?.idleTimeoutMillis ?? 30000,
                connectionTimeoutMillis: options.pool?.connectionTimeoutMillis ?? 30000,
                // Disable statement timeout for long-running operations
                statement_timeout: options.pool?.statement_timeout ?? 0,
                // Enable TCP keepalive to prevent connection drops
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
            };

            if (options.connectionString) {
                this.#poolConfig.connectionString = options.connectionString;
            } else {
                this.#poolConfig.host = options.connection?.host ?? 'localhost';
                this.#poolConfig.port = options.connection?.port ?? 5432;
                this.#poolConfig.database = options.connection?.database ?? 'l10nmonster';
                this.#poolConfig.user = options.connection?.user;
                this.#poolConfig.password = options.connection?.password;
            }

            this.#pool = new Pool(this.#poolConfig);
        }
    }

    /**
     * Gets the underlying pool for advanced operations.
     * @returns {pg.Pool}
     */
    get pool() {
        return this.#pool;
    }

    /**
     * Initialize the DAL manager.
     * @param {Object} mm - MonsterManager instance.
     */
    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        this.activeChannels = new Set(mm.rm.channelIds);

        // Recreate pool if it was shutdown and we own it
        if (!this.#pool && this.#ownsPool && this.#poolConfig) {
            this.#pool = new Pool(this.#poolConfig);
        }

        // Log connection info
        const poolOpts = this.#pool.options || {};
        const host = poolOpts.host || 'localhost';
        const port = poolOpts.port || 5432;
        const database = poolOpts.database || 'l10nmonster';
        const user = poolOpts.user || 'default';
        const poolSize = `${poolOpts.min || 2}-${poolOpts.max || 10}`;

        logVerbose`PostgresDALManager: connecting to ${host}:${port}/${database} as ${user} (pool: ${poolSize})`;

        // Test connection and create tables
        try {
            // Test the connection first
            const startTime = Date.now();
            const { rows } = await this.#pool.query('SELECT version()');
            const elapsed = Date.now() - startTime;
            const pgVersion = rows[0]?.version?.split(' ').slice(0, 2).join(' ') || 'unknown';
            logVerbose`PostgresDALManager: connected to ${pgVersion} in ${elapsed}ms`;

            // Create channel_toc table if not exists
            let stepStart = Date.now();
            await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS channel_toc (
                channel TEXT NOT NULL PRIMARY KEY,
                store TEXT,
                ts BIGINT,
                resources INTEGER,
                segments INTEGER
            );
        `);
            logVerbose`PostgresDALManager: channel_toc table ready in ${Date.now() - stepStart}ms`;

            // Create jobs table if not exists (shared across all language pairs)
            stepStart = Date.now();
            await this.#pool.query(/* sql */`
                CREATE TABLE IF NOT EXISTS jobs (
                    job_guid TEXT NOT NULL PRIMARY KEY,
                    source_lang TEXT NOT NULL,
                    target_lang TEXT NOT NULL,
                    translation_provider TEXT,
                    status TEXT,
                    updated_at TEXT,
                    job_props JSONB,
                    tm_store TEXT
                );
            `);
            logVerbose`PostgresDALManager: jobs table ready in ${Date.now() - stepStart}ms`;

            stepStart = Date.now();
            await this.#pool.query(/* sql */`
                CREATE INDEX IF NOT EXISTS idx_jobs_source_target_provider_status
                    ON jobs (source_lang, target_lang, translation_provider, status, job_guid);
            `);
            // Index for TMStore queries (filter by tm_store)
            await this.#pool.query(/* sql */`
                CREATE INDEX IF NOT EXISTS idx_jobs_tm_store
                    ON jobs (tm_store, source_lang, target_lang);
            `);
            logVerbose`PostgresDALManager: jobs indexes ready in ${Date.now() - stepStart}ms`;

            // Enable pg_trgm extension for fast case-insensitive text search
            stepStart = Date.now();
            await this.#pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
            logVerbose`PostgresDALManager: pg_trgm extension ready in ${Date.now() - stepStart}ms`;

            logVerbose`PostgresDALManager: schema initialized`;
        } catch (error) {
            if (error.code === '3D000') {
                // Database does not exist - create it
                await this.#createDatabase();
                // Retry initialization
                return this.init(mm);
            }
            throw error;
        }
    }

    /**
     * Creates the database by connecting to 'postgres' and running CREATE DATABASE.
     */
    async #createDatabase() {
        const dbName = this.#poolConfig?.database || 'l10nmonster';
        logVerbose`PostgresDALManager: database "${dbName}" does not exist, creating...`;

        // Close the current pool (it's connected to non-existent db)
        const oldPool = this.#pool;
        this.#pool = null;
        await oldPool.end();

        // Create a new pool connected to 'postgres' system database
        const adminPoolConfig = {
            ...this.#poolConfig,
            database: 'postgres',
        };
        const adminPool = new Pool(adminPoolConfig);

        try {
            // Create the database (identifier must be quoted to handle special chars)
            await adminPool.query(`CREATE DATABASE "${dbName}";`);
            logVerbose`PostgresDALManager: database "${dbName}" created`;
        } finally {
            await adminPool.end();
        }

        // Recreate the original pool
        this.#pool = new Pool(this.#poolConfig);
    }

    /**
     * Get ChannelDAL for a channel.
     * @param {string} channelId - Channel identifier.
     * @returns {PgChannelDAL} ChannelDAL instance.
     */
    channel(channelId) {
        if (!this.#pool) {
            throw new Error('PostgresDALManager has been shut down');
        }
        if (!this.activeChannels.has(channelId)) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }

        if (!this.#channelDALCache.has(channelId)) {
            this.#channelDALCache.set(channelId, new PgChannelDAL(this.#pool, channelId));
        }
        return this.#channelDALCache.get(channelId);
    }

    /**
     * Get TuDAL for a language pair.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @returns {PgTuDAL} TuDAL instance.
     */
    tu(sourceLang, targetLang) {
        if (!this.#pool) {
            throw new Error('PostgresDALManager has been shut down');
        }
        const pairKey = `${sourceLang}#${targetLang}`;

        if (!this.#tuDALCache.has(pairKey)) {
            this.#tuDALCache.set(pairKey, new PgTuDAL(this.#pool, sourceLang, targetLang, this));
        }
        return this.#tuDALCache.get(pairKey);
    }

    // ========== Cross-Shard Aggregation Methods ==========

    /**
     * Get all TuDAL instances.
     * @returns {Promise<PgTuDAL[]>}
     */
    async #getAllTuDALs() {
        // First ensure we've discovered all language pairs
        await this.getAvailableLangPairs();
        return Array.from(this.#tuDALCache.values());
    }

    /**
     * Get all available language pairs by querying the jobs table.
     * @returns {Promise<Array<[string, string]>>}
     */
    async getAvailableLangPairs() {
        if (!this.#pool) {
            return []; // Pool closed, return empty
        }
        const { rows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT source_lang, target_lang FROM jobs;
        `);

        // Initialize TuDALs for each pair found
        for (const { source_lang, target_lang } of rows) {
            const pairKey = `${source_lang}#${target_lang}`;
            if (!this.#tuDALCache.has(pairKey)) {
                this.#tuDALCache.set(pairKey, new PgTuDAL(this.#pool, source_lang, target_lang, this));
            }
        }

        return rows.map(({ source_lang, target_lang }) => [source_lang, target_lang]);
    }

    /**
     * Get total job count across all language pairs.
     * @returns {Promise<number>}
     */
    async getJobCount() {
        let total = 0;
        for (const tuDAL of await this.#getAllTuDALs()) {
            total += await tuDAL.getJobCount();
        }
        return total;
    }

    /**
     * Get a job by its GUID, searching all language pairs.
     * @param {string} jobGuid - Job identifier.
     * @returns {Promise<Object|undefined>}
     */
    async getJob(jobGuid) {
        for (const tuDAL of await this.#getAllTuDALs()) {
            const job = await tuDAL.getJob(jobGuid);
            if (job) return job;
        }
        return undefined;
    }

    /**
     * Get job statistics across all language pairs.
     * @returns {Promise<Array>}
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
     * Runs a callback in bootstrap mode.
     * For PostgreSQL, this is a simple passthrough - no special optimization is done.
     * The incremental transactional path is used for all operations.
     *
     * @template T
     * @param {() => Promise<T>} callback - The bootstrap operation to run.
     * @returns {Promise<T>} The result of the callback.
     */
    async withBootstrapMode(callback) {
        return callback();
    }

    /**
     * Shutdown the DAL manager.
     */
    async shutdown() {
        logVerbose`PostgresDALManager: shutdown called`;

        // Clear caches
        this.#channelDALCache.clear();
        this.#tuDALCache.clear();

        // Only close pool if we own it and haven't already closed it
        // Store reference and null out immediately to prevent double-close on repeated SIGINT
        const pool = this.#pool;
        this.#pool = null;

        if (this.#ownsPool && pool) {
            logVerbose`PostgresDALManager: closing pool`;
            await pool.end();
            logVerbose`PostgresDALManager: pool closed`;
        }
    }
}
