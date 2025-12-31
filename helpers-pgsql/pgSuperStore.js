import pg from 'pg';
import { logVerbose } from '@l10nmonster/core';
import { PgTmStore } from './pgTmStore.js';
import { PgSnapStore } from './pgSnapStore.js';

const { Pool, types } = pg;

// Configure BIGINT (OID 20) to parse as JavaScript number instead of string.
types.setTypeParser(20, (val) => (val === null ? null : Number(val)));

/**
 * @typedef {Object} PgSuperStoreOptions
 * @property {string} [connectionString] - PostgreSQL connection string
 * @property {Object} [connection] - Connection parameters
 * @property {string} [connection.host] - Database host (default: 'localhost')
 * @property {number} [connection.port] - Database port (default: 5432)
 * @property {string} [connection.database] - Database name (default: 'l10nmonster')
 * @property {string} [connection.user] - Database user
 * @property {string} [connection.password] - Database password
 * @property {Object} [pool] - Pool configuration
 * @property {number} [pool.min] - Minimum pool size (default: 4)
 * @property {number} [pool.max] - Maximum pool size (default: 32)
 * @property {number} [pool.idleTimeoutMillis] - Idle timeout (default: 30000)
 * @property {boolean|Object} [ssl] - SSL configuration
 * @property {pg.Pool} [existingPool] - Pre-configured Pool instance
 */

/**
 * PostgreSQL SuperStore - Factory for creating TmStore and SnapStore instances.
 * All stores created from this factory share the same connection pool.
 */
export class PgSuperStore {
    #pool;
    #ownsPool;
    #tablesInitialized = false;
    #initPromise = null;

    /**
     * Creates a new PgSuperStore.
     * @param {PgSuperStoreOptions} [options]
     */
    constructor(options = {}) {
        if (options.existingPool) {
            this.#pool = options.existingPool;
            this.#ownsPool = false;
        } else {
            this.#ownsPool = true;
            const poolConfig = {
                ssl: options.ssl,
                min: options.pool?.min ?? 4,
                max: options.pool?.max ?? 32,
                idleTimeoutMillis: options.pool?.idleTimeoutMillis ?? 30000,
            };

            if (options.connectionString) {
                poolConfig.connectionString = options.connectionString;
            } else {
                poolConfig.host = options.connection?.host ?? 'localhost';
                poolConfig.port = options.connection?.port ?? 5432;
                poolConfig.database = options.connection?.database ?? 'l10nmonster';
                poolConfig.user = options.connection?.user;
                poolConfig.password = options.connection?.password;
            }

            this.#pool = new Pool(poolConfig);
        }
    }

    /**
     * Gets the underlying pool.
     * @returns {pg.Pool}
     */
    get pool() {
        return this.#pool;
    }

    /**
     * Ensures all required tables exist. Called lazily on first store operation.
     * Uses a promise lock to prevent concurrent initialization.
     */
    async ensureTables() {
        if (this.#tablesInitialized) return;

        if (this.#initPromise) {
            return this.#initPromise;
        }

        this.#initPromise = this.#createTables();
        try {
            await this.#initPromise;
        } finally {
            this.#initPromise = null;
        }
    }

    async #createTables() {
        if (this.#tablesInitialized) return;

        const startTime = Date.now();
        logVerbose`PgSuperStore: initializing tables...`;

        // Test connection
        const { rows } = await this.#pool.query('SELECT version()');
        const pgVersion = rows[0]?.version?.split(' ').slice(0, 2).join(' ') || 'unknown';
        logVerbose`PgSuperStore: connected to ${pgVersion}`;

        // Create TM blocks table
        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS tm_blocks (
                tm_store_id TEXT NOT NULL,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                job_guid TEXT NOT NULL,
                guid TEXT NOT NULL,
                rid TEXT,
                sid TEXT,
                nsrc JSONB,
                nsrc_flat TEXT,
                ntgt JSONB,
                ntgt_flat TEXT,
                notes JSONB,
                tu_props JSONB,
                q INTEGER,
                ts BIGINT,
                tu_order INTEGER,
                PRIMARY KEY (tm_store_id, source_lang, target_lang, guid, job_guid)
            );
        `);

        // Create TM jobs table
        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS tm_jobs (
                tm_store_id TEXT NOT NULL,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                job_guid TEXT NOT NULL,
                translation_provider TEXT,
                status TEXT,
                updated_at TEXT,
                job_props JSONB,
                block_id TEXT,
                PRIMARY KEY (tm_store_id, job_guid)
            );
        `);

        // Create snap resources table
        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS snap_resources (
                snap_store_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                rid TEXT NOT NULL,
                row_data JSONB NOT NULL,
                content_hash TEXT NOT NULL,
                valid_from BIGINT NOT NULL,
                valid_to BIGINT,
                PRIMARY KEY (snap_store_id, channel_id, rid, valid_from)
            );
        `);

        // Create snap segments table
        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS snap_segments (
                snap_store_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                guid TEXT NOT NULL,
                row_data JSONB NOT NULL,
                content_hash TEXT NOT NULL,
                valid_from BIGINT NOT NULL,
                valid_to BIGINT,
                PRIMARY KEY (snap_store_id, channel_id, guid, valid_from)
            );
        `);

        // Create snap TOC table
        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS snap_toc (
                snap_store_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                ts BIGINT NOT NULL,
                resources_count INTEGER,
                segments_count INTEGER,
                PRIMARY KEY (snap_store_id, channel_id, ts)
            );
        `);

        // Create indexes in parallel
        const indexQueries = [
            // TM blocks indexes
            `CREATE INDEX IF NOT EXISTS idx_tm_blocks_lang_pair ON tm_blocks (tm_store_id, source_lang, target_lang)`,
            `CREATE INDEX IF NOT EXISTS idx_tm_blocks_job ON tm_blocks (tm_store_id, source_lang, target_lang, job_guid)`,
            `CREATE INDEX IF NOT EXISTS idx_tm_blocks_guid ON tm_blocks (tm_store_id, source_lang, target_lang, guid)`,
            `CREATE INDEX IF NOT EXISTS idx_tm_blocks_nsrc_flat ON tm_blocks USING hash (nsrc_flat)`,

            // TM jobs indexes
            `CREATE INDEX IF NOT EXISTS idx_tm_jobs_lang ON tm_jobs (tm_store_id, source_lang, target_lang)`,
            `CREATE INDEX IF NOT EXISTS idx_tm_jobs_block ON tm_jobs (tm_store_id, source_lang, target_lang, block_id)`,

            // Snap resources indexes
            `CREATE INDEX IF NOT EXISTS idx_snap_resources_lookup ON snap_resources (snap_store_id, channel_id, valid_from, valid_to)`,

            // Snap segments indexes
            `CREATE INDEX IF NOT EXISTS idx_snap_segments_lookup ON snap_segments (snap_store_id, channel_id, valid_from, valid_to)`,
        ];

        await Promise.all(indexQueries.map(q => this.#pool.query(q).catch(() => {})));

        // Create partial indexes for current rows
        await this.#pool.query(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_snap_resources_current
            ON snap_resources (snap_store_id, channel_id) WHERE valid_to IS NULL;
        `).catch(() => {});

        await this.#pool.query(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_snap_segments_current
            ON snap_segments (snap_store_id, channel_id) WHERE valid_to IS NULL;
        `).catch(() => {});

        this.#tablesInitialized = true;
        logVerbose`PgSuperStore: tables initialized in ${Date.now() - startTime}ms`;
    }

    /**
     * Creates a TmStore instance.
     * @param {Object} options - TmStore options
     * @param {string} options.id - Logical store ID (for L10n Monster)
     * @param {string} [options.tmStoreId] - Data segregation key (defaults to id)
     * @param {'readwrite'|'readonly'|'writeonly'} [options.access='readwrite'] - Access mode
     * @param {'job'|'provider'|'language'} [options.partitioning='language'] - Partitioning strategy
     * @param {string[]} [options.onlyLeveraged] - Channel IDs to filter TUs by
     * @param {string} [options.snapStoreId] - SnapStore ID for onlyLeveraged filtering
     * @returns {PgTmStore}
     */
    createTmStore(options) {
        if (!options?.id) {
            throw new Error('PgSuperStore.createTmStore: id is required');
        }
        return new PgTmStore(this.#pool, this.ensureTables.bind(this), options);
    }

    /**
     * Creates a SnapStore instance.
     * @param {Object} options - SnapStore options
     * @param {string} options.id - Logical store ID (for L10n Monster)
     * @param {string} [options.snapStoreId] - Data segregation key (defaults to id)
     * @returns {PgSnapStore}
     */
    createSnapStore(options) {
        if (!options?.id) {
            throw new Error('PgSuperStore.createSnapStore: id is required');
        }
        return new PgSnapStore(this.#pool, this.ensureTables.bind(this), options);
    }

    /**
     * Shuts down the SuperStore and closes the pool (if owned).
     */
    async shutdown() {
        logVerbose`PgSuperStore: shutdown called`;

        const pool = this.#pool;
        this.#pool = null;

        if (this.#ownsPool && pool) {
            logVerbose`PgSuperStore: closing pool`;
            await pool.end();
            logVerbose`PgSuperStore: pool closed`;
        }
    }
}
