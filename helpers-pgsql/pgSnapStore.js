import crypto from 'node:crypto';
import { logInfo, logVerbose } from '@l10nmonster/core';

/**
 * @typedef {import('@l10nmonster/core').SnapStore} SnapStore
 */

/**
 * Computes MD5 hash of row data for fast change detection.
 * @param {Object} rowData
 * @returns {string}
 */
function computeHash(rowData) {
    return crypto.createHash('md5').update(JSON.stringify(rowData)).digest('hex');
}

/**
 * PostgreSQL implementation of SnapStore with delta-based temporal storage.
 * Uses SCD Type 2 pattern with valid_from/valid_to timestamps.
 * @implements {SnapStore}
 */
export class PgSnapStore {

    /** @type {string} */
    id;

    #getPool;
    #ensureTables;
    #scheduleShutdown;
    #snapStoreId;
    #shutdownScheduled = false;

    /**
     * @param {Function} getPool - Function to get the PostgreSQL pool
     * @param {Function} ensureTables - Function to ensure tables exist
     * @param {Function} scheduleShutdown - Function to schedule shutdown with mm
     * @param {Object} options - Store options
     * @param {string} options.id - Logical store ID
     * @param {string} [options.snapStoreId] - Data segregation key (defaults to id)
     */
    constructor(getPool, ensureTables, scheduleShutdown, options) {
        this.#getPool = getPool;
        this.#ensureTables = ensureTables;
        this.#scheduleShutdown = scheduleShutdown;
        this.id = options.id;
        this.#snapStoreId = options.snapStoreId ?? options.id;

        logVerbose`PgSnapStore ${this.id} created with snapStoreId: ${this.#snapStoreId}`;
    }

    get #pool() {
        return this.#getPool();
    }

    /**
     * Initialize the store.
     * @param {Object} mm - MonsterManager instance
     */
    init(mm) {
        if (!this.#shutdownScheduled) {
            this.#scheduleShutdown(mm);
            this.#shutdownScheduled = true;
        }
    }

    /**
     * Gets the table of contents listing all snapshots.
     * @returns {Promise<Record<string, number[]>>}
     */
    async getTOC() {
        await this.#ensureTables();

        // Get timestamps where both resources and segments exist
        const { rows } = await this.#pool.query(/* sql */`
            SELECT channel_id, ts
            FROM snap_toc
            WHERE snap_store_id = $1
              AND resources_count IS NOT NULL
              AND segments_count IS NOT NULL
            ORDER BY channel_id, ts DESC;
        `, [this.#snapStoreId]);

        /** @type {Record<string, number[]>} */
        const toc = {};
        for (const row of rows) {
            if (!toc[row.channel_id]) {
                toc[row.channel_id] = [];
            }
            toc[row.channel_id].push(row.ts);
        }

        return toc;
    }

    /**
     * Generates rows from a snapshot at a specific timestamp.
     * Uses point-in-time query with temporal filtering.
     * @param {number} ts - Snapshot timestamp
     * @param {string} channelId - Channel identifier
     * @param {string} table - Table name ('segments' or 'resources')
     * @returns {AsyncGenerator<Record<string, unknown>>}
     */
    async *generateRows(ts, channelId, table) {
        await this.#ensureTables();

        const tableName = table === 'resources' ? 'snap_resources' : 'snap_segments';
        const orderCol = table === 'resources' ? "row_data->>'rid'" : "(row_data->>'seg_order')::int";

        // Point-in-time query: get rows that were valid at timestamp ts
        const { rows } = await this.#pool.query(/* sql */`
            SELECT row_data
            FROM ${tableName}
            WHERE snap_store_id = $1 AND channel_id = $2
              AND valid_from <= $3
              AND (valid_to IS NULL OR valid_to > $3)
            ORDER BY ${orderCol};
        `, [this.#snapStoreId, channelId, ts]);

        for (const row of rows) {
            yield row.row_data;
        }
    }

    /**
     * Saves a snapshot from a row generator.
     * Uses delta-based storage with hash comparison for efficiency.
     * @param {number} ts - Snapshot timestamp
     * @param {string} channelId - Channel identifier
     * @param {AsyncGenerator<Record<string, unknown>>} rowGenerator - Rows to save
     * @param {string} table - Table name ('segments' or 'resources')
     * @returns {Promise<{ count: number }>}
     */
    async saveSnap(ts, channelId, rowGenerator, table) {
        await this.#ensureTables();

        logInfo`Saving snap(${table}) for channel ${channelId} into snap store ${this.id}...`;

        const keyCol = table === 'resources' ? 'rid' : 'guid';
        const tableName = table === 'resources' ? 'snap_resources' : 'snap_segments';
        const countCol = table === 'resources' ? 'resources_count' : 'segments_count';

        // 1. Collect all incoming rows with their keys and hashes
        /** @type {Map<string, { rowData: Object; hash: string }>} */
        const incomingRows = new Map();
        for await (const row of rowGenerator) {
            const key = /** @type {string} */ (row[keyCol]);
            if (key) {
                const hash = computeHash(row);
                incomingRows.set(key, { rowData: row, hash });
            }
        }

        // 2. Get current active rows (key + hash only - fast query)
        const { rows: currentRows } = await this.#pool.query(/* sql */`
            SELECT ${keyCol} as key, content_hash as hash
            FROM ${tableName}
            WHERE snap_store_id = $1 AND channel_id = $2 AND valid_to IS NULL;
        `, [this.#snapStoreId, channelId]);

        const currentMap = new Map(currentRows.map(r => [r.key, r.hash]));

        // 3. Determine changes using hash comparison
        /** @type {Array<{ key: string; rowData: Object; hash: string }>} */
        const toInsert = [];

        /** @type {string[]} */
        const toClose = [];

        for (const [key, { rowData, hash }] of incomingRows) {
            const currentHash = currentMap.get(key);
            if (currentHash !== hash) {
                toInsert.push({ key, rowData, hash });
                if (currentHash) {
                    toClose.push(key); // Changed
                }
            }
        }

        for (const key of currentMap.keys()) {
            if (!incomingRows.has(key)) {
                toClose.push(key); // Deleted
            }
        }

        // 4. Apply changes in transaction with batch operations
        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');

            // Batch close old versions using ANY
            if (toClose.length > 0) {
                await client.query(/* sql */`
                    UPDATE ${tableName} SET valid_to = $1
                    WHERE snap_store_id = $2 AND channel_id = $3
                      AND ${keyCol} = ANY($4) AND valid_to IS NULL;
                `, [ts, this.#snapStoreId, channelId, toClose]);
            }

            // Batch insert new versions using UNNEST
            if (toInsert.length > 0) {
                const keys = toInsert.map(r => r.key);
                const rowDatas = toInsert.map(r => JSON.stringify(r.rowData));
                const hashes = toInsert.map(r => r.hash);

                await client.query(/* sql */`
                    INSERT INTO ${tableName}
                        (snap_store_id, channel_id, ${keyCol}, row_data, content_hash, valid_from, valid_to)
                    SELECT $1, $2, k, d::jsonb, h, $3, NULL
                    FROM UNNEST($4::text[], $5::text[], $6::text[]) AS t(k, d, h);
                `, [this.#snapStoreId, channelId, ts, keys, rowDatas, hashes]);
            }

            // Record in TOC (upsert)
            await client.query(/* sql */`
                INSERT INTO snap_toc (snap_store_id, channel_id, ts, ${countCol})
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (snap_store_id, channel_id, ts)
                DO UPDATE SET ${countCol} = EXCLUDED.${countCol};
            `, [this.#snapStoreId, channelId, ts, incomingRows.size]);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        const unchanged = incomingRows.size - toInsert.length + (toClose.length - toInsert.filter(r => currentMap.has(r.key)).length);
        logVerbose`Saved ${incomingRows.size} ${[incomingRows.size, 'row', 'rows']} from table ${table} in channel ${channelId} into snap store ${this.id} ts=${ts} (${toInsert.length} new/changed, ${toClose.length - toInsert.filter(r => currentMap.has(r.key)).length} deleted, ${unchanged} unchanged)`;

        return { count: incomingRows.size };
    }
}
