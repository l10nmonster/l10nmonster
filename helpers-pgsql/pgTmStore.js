import { logVerbose, logWarn } from '@l10nmonster/core';
import { flattenNormalizedSourceToOrdinal, sanitizeTableName } from './pgUtils.js';

/**
 * @typedef {import('@l10nmonster/core').TMStore} TMStore
 * @typedef {import('@l10nmonster/core').TMStoreTOC} TMStoreTOC
 * @typedef {import('@l10nmonster/core').JobPropsTusPair} JobPropsTusPair
 */

/**
 * PostgreSQL implementation of TMStore using unified schema.
 * Uses the same tus_{sl}_{tl} tables as PgTuDAL with store_id for provenance tracking.
 * @implements {TMStore}
 */
export class PgTmStore {

    /** @type {string} */
    id;

    /** @type {'readwrite' | 'readonly' | 'writeonly'} */
    access = 'readwrite';

    /** @type {'job' | 'provider' | 'language'} */
    partitioning = 'language';

    #getPool;
    #ensureBaseTables;
    #scheduleShutdown;
    #tmStoreId;
    #onlyLeveraged;
    #snapStoreId;
    /** @type {Map<string, boolean>} */
    #tablesCreated = new Map();
    #shutdownScheduled = false;

    /**
     * @param {Function} getPool - Function to get the PostgreSQL pool
     * @param {Function} ensureBaseTables - Function to ensure base tables exist
     * @param {Function} scheduleShutdown - Function to schedule shutdown with mm
     * @param {Object} options - Store options
     * @param {string} options.id - Logical store ID
     * @param {string} [options.tmStoreId] - Data segregation key (defaults to id)
     * @param {'readwrite'|'readonly'|'writeonly'} [options.access='readwrite']
     * @param {'job'|'provider'|'language'} [options.partitioning='language']
     * @param {string[]} [options.onlyLeveraged] - Channel IDs to filter TUs by
     * @param {string} [options.snapStoreId] - SnapStore ID for onlyLeveraged filtering
     */
    constructor(getPool, ensureBaseTables, scheduleShutdown, options) {
        this.#getPool = getPool;
        this.#ensureBaseTables = ensureBaseTables;
        this.#scheduleShutdown = scheduleShutdown;
        this.id = options.id;
        this.#tmStoreId = options.tmStoreId ?? options.id;

        if (options.access) {
            if (!['readwrite', 'readonly', 'writeonly'].includes(options.access)) {
                throw new Error(`Unknown access type: ${options.access}`);
            }
            this.access = options.access;
        }

        if (options.partitioning) {
            if (!['job', 'provider', 'language'].includes(options.partitioning)) {
                throw new Error(`Unknown partitioning type: ${options.partitioning}`);
            }
            this.partitioning = options.partitioning;
        }

        if (options.onlyLeveraged) {
            if (!Array.isArray(options.onlyLeveraged) || options.onlyLeveraged.length === 0) {
                throw new Error('onlyLeveraged must be a non-empty array of channel IDs');
            }
            if (!options.snapStoreId) {
                throw new Error('snapStoreId is required when using onlyLeveraged');
            }
            this.#onlyLeveraged = options.onlyLeveraged;
            this.#snapStoreId = options.snapStoreId;
        }

        logVerbose`PgTmStore ${this.id} created with tmStoreId: ${this.#tmStoreId} access: ${this.access} partitioning: ${this.partitioning}${this.#onlyLeveraged ? ` onlyLeveraged: ${this.#onlyLeveraged.join(', ')}` : ''}`;
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
     * Gets the sanitized table name for a language pair.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @returns {string}
     */
    #getTusTableName(sourceLang, targetLang) {
        return sanitizeTableName(`tus_${sourceLang}_${targetLang}`);
    }

    /**
     * Ensures the TU table for a language pair exists.
     * @param {string} sourceLang
     * @param {string} targetLang
     */
    async #ensureTusTable(sourceLang, targetLang) {
        const tableName = this.#getTusTableName(sourceLang, targetLang);
        if (this.#tablesCreated.has(tableName)) return;

        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS ${tableName} (
                store_id TEXT,
                guid TEXT NOT NULL,
                job_guid TEXT NOT NULL,
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
                rank INTEGER,
                PRIMARY KEY (guid, job_guid)
            );
        `);

        // Create indexes for TMStore queries
        const indexQueries = [
            `CREATE INDEX IF NOT EXISTS idx_${tableName}_store_job ON ${tableName} (store_id, job_guid)`,
            `CREATE INDEX IF NOT EXISTS idx_${tableName}_guid_rank ON ${tableName} (guid, rank)`,
        ];
        await Promise.all(indexQueries.map(q => this.#pool.query(q).catch(() => {})));

        this.#tablesCreated.set(tableName, true);
    }

    /**
     * Gets available language pairs in the store.
     * Uses the jobs table filtered by tm_store to find language pairs.
     * @returns {Promise<Array<[string, string]>>}
     */
    async getAvailableLangPairs() {
        await this.#ensureBaseTables();

        const { rows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT source_lang, target_lang
            FROM jobs
            WHERE tm_store = $1;
        `, [this.#tmStoreId]);

        return rows.map(r => [r.source_lang, r.target_lang]);
    }

    /**
     * Gets the table of contents for a language pair.
     * Queries the jobs table filtered by tm_store.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @returns {Promise<TMStoreTOC>}
     */
    async getTOC(sourceLang, targetLang) {
        await this.#ensureBaseTables();

        // Get all jobs for this store/language pair, using job_guid as block_id
        // In the unified schema, we use job_guid as the block identifier
        const { rows } = await this.#pool.query(/* sql */`
            SELECT job_guid, updated_at
            FROM jobs
            WHERE tm_store = $1 AND source_lang = $2 AND target_lang = $3
            ORDER BY updated_at DESC;
        `, [this.#tmStoreId, sourceLang, targetLang]);

        /** @type {Record<string, { blockName: string; modified: string; jobs: Array<[string, string]> }>} */
        const blocks = {};

        // Each job is its own block (language partitioning)
        for (const row of rows) {
            const blockId = row.job_guid;
            blocks[blockId] = {
                blockName: `${this.#tmStoreId}/${sourceLang}/${targetLang}/${blockId}`,
                modified: row.updated_at,
                jobs: [[row.job_guid, row.updated_at]],
            };
        }

        // Generate storedBlocks from blocks
        /** @type {[string, string][]} */
        const storedBlocks = Object.entries(blocks).map(([blockId, block]) => [blockId, block.blockName]);

        return {
            v: 1,
            sourceLang,
            targetLang,
            blocks,
            storedBlocks,
        };
    }

    /**
     * Gets TM blocks by their IDs.
     * Queries the unified tus_{sl}_{tl} table filtered by store_id.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @param {string[]} blockIds
     * @returns {AsyncGenerator<JobPropsTusPair>}
     */
    async *getTmBlocks(sourceLang, targetLang, blockIds) {
        await this.#ensureBaseTables();

        const toc = await this.getTOC(sourceLang, targetLang);

        // Collect all job GUIDs from requested blocks
        const jobGuids = [];
        for (const blockId of blockIds) {
            const block = toc.blocks[blockId];
            if (block) {
                for (const [jobGuid] of block.jobs) {
                    jobGuids.push(jobGuid);
                }
            } else {
                logWarn`Block not found: ${blockId}`;
            }
        }

        if (jobGuids.length === 0) return;

        await this.#ensureTusTable(sourceLang, targetLang);
        const tusTable = this.#getTusTableName(sourceLang, targetLang);

        // Build the query with optional onlyLeveraged filtering
        let query;
        let params;

        if (this.#onlyLeveraged && this.#snapStoreId) {
            // Filter by GUIDs present in the latest snapshot of specified channels
            query = /* sql */`
                WITH latest_snaps AS (
                    SELECT channel_id, MAX(ts) as max_ts
                    FROM snap_toc
                    WHERE snap_store_id = $1 AND channel_id = ANY($2)
                    GROUP BY channel_id
                ),
                leveraged_guids AS (
                    SELECT DISTINCT s.guid
                    FROM snap_segments s
                    JOIN latest_snaps ls ON s.channel_id = ls.channel_id
                    WHERE s.snap_store_id = $1
                      AND s.valid_from <= ls.max_ts
                      AND (s.valid_to IS NULL OR s.valid_to > ls.max_ts)
                )
                SELECT t.job_guid, t.guid, t.rid, t.sid, t.nsrc, t.ntgt, t.notes, t.tu_props, t.q, t.ts, t.tu_order
                FROM ${tusTable} t
                WHERE t.store_id = $3
                  AND t.job_guid = ANY($4)
                  AND t.guid IN (SELECT guid FROM leveraged_guids)
                ORDER BY t.job_guid, t.tu_order;
            `;
            params = [this.#snapStoreId, this.#onlyLeveraged, this.#tmStoreId, jobGuids];
        } else {
            query = /* sql */`
                SELECT job_guid, guid, rid, sid, nsrc, ntgt, notes, tu_props, q, ts, tu_order
                FROM ${tusTable}
                WHERE store_id = $1 AND job_guid = ANY($2)
                ORDER BY job_guid, tu_order;
            `;
            params = [this.#tmStoreId, jobGuids];
        }

        const { rows } = await this.#pool.query(query, params);

        // Get job metadata from jobs table
        const jobPropsMap = new Map();
        const { rows: jobRows } = await this.#pool.query(/* sql */`
            SELECT job_guid, translation_provider, status, updated_at, job_props
            FROM jobs
            WHERE tm_store = $1 AND job_guid = ANY($2);
        `, [this.#tmStoreId, jobGuids]);

        for (const row of jobRows) {
            jobPropsMap.set(row.job_guid, {
                jobGuid: row.job_guid,
                sourceLang,
                targetLang,
                translationProvider: row.translation_provider,
                status: row.status,
                updatedAt: row.updated_at,
                ...(row.job_props || {}),
            });
        }

        // Group TUs by job
        /** @type {Map<string, Array>} */
        const tusByJob = new Map();
        for (const row of rows) {
            if (!tusByJob.has(row.job_guid)) {
                tusByJob.set(row.job_guid, []);
            }
            tusByJob.get(row.job_guid).push({
                guid: row.guid,
                jobGuid: row.job_guid,
                rid: row.rid,
                sid: row.sid,
                nsrc: row.nsrc,
                ntgt: row.ntgt,
                notes: row.notes,
                q: row.q,
                ts: row.ts,
                ...(row.tu_props || {}),
            });
        }

        // Yield job/TU pairs
        for (const [jobGuid, tus] of tusByJob) {
            const jobProps = jobPropsMap.get(jobGuid);
            if (jobProps) {
                yield { jobProps, tus };
            }
        }
    }

    /**
     * Gets a writer for committing TM data.
     * Writes to the unified tus_{sl}_{tl} table with store_id set.
     * @param {string} sourceLang
     * @param {string} targetLang
     * @param {Function} cb - Callback function receiving a write function
     */
    async getWriter(sourceLang, targetLang, cb) {
        if (this.access === 'readonly') {
            throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
        }

        await this.#ensureBaseTables();
        await this.#ensureTusTable(sourceLang, targetLang);
        const tusTable = this.#getTusTableName(sourceLang, targetLang);
        const toc = await this.getTOC(sourceLang, targetLang);

        /**
         * @param {{ translationProvider?: string; blockId: string }} blockProps
         * @param {AsyncIterable<JobPropsTusPair>|null} tmBlockIterator
         */
        const writeBlock = async (blockProps, tmBlockIterator) => {
            const { blockId } = blockProps;

            if (tmBlockIterator) {
                const client = await this.#pool.connect();
                try {
                    await client.query('BEGIN');

                    let tuCount = 0;
                    const jobGuidsInBlock = [];
                    const affectedGuids = new Set();

                    for await (const { jobProps, tus } of tmBlockIterator) {
                        const { jobGuid, translationProvider, status, updatedAt, ...otherJobProps } = jobProps;
                        jobGuidsInBlock.push(jobGuid);

                        // Upsert job metadata into jobs table with tm_store set
                        await client.query(/* sql */`
                            INSERT INTO jobs (source_lang, target_lang, job_guid, translation_provider, status, updated_at, job_props, tm_store)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (job_guid) DO UPDATE SET
                                source_lang = EXCLUDED.source_lang,
                                target_lang = EXCLUDED.target_lang,
                                translation_provider = EXCLUDED.translation_provider,
                                status = EXCLUDED.status,
                                updated_at = EXCLUDED.updated_at,
                                job_props = EXCLUDED.job_props,
                                tm_store = EXCLUDED.tm_store;
                        `, [sourceLang, targetLang, jobGuid, translationProvider, status, updatedAt ?? new Date().toISOString(), JSON.stringify(otherJobProps), this.#tmStoreId]);

                        // Delete existing TUs for this job from this store (to replace)
                        await client.query(/* sql */`
                            DELETE FROM ${tusTable}
                            WHERE store_id = $1 AND job_guid = $2;
                        `, [this.#tmStoreId, jobGuid]);

                        // Insert TUs in batches using UNNEST
                        if (tus.length > 0) {
                            const storeIds = [];
                            const guids = [];
                            const jobGuidsArr = [];
                            const rids = [];
                            const sids = [];
                            const nsrcs = [];
                            const nsrcFlats = [];
                            const ntgts = [];
                            const ntgtFlats = [];
                            const notesArr = [];
                            const tuPropsArr = [];
                            const qs = [];
                            const tss = [];
                            const tuOrders = [];
                            const ranks = [];

                            tus.forEach((tu, idx) => {
                                const { guid, rid, sid, nsrc, ntgt, notes, q, ts, ...tuProps } = tu;
                                storeIds.push(this.#tmStoreId);
                                guids.push(guid);
                                jobGuidsArr.push(jobGuid);
                                rids.push(rid);
                                sids.push(sid);
                                nsrcs.push(JSON.stringify(nsrc));
                                nsrcFlats.push(flattenNormalizedSourceToOrdinal(nsrc));
                                ntgts.push(ntgt ? JSON.stringify(ntgt) : null);
                                ntgtFlats.push(ntgt ? flattenNormalizedSourceToOrdinal(ntgt) : null);
                                notesArr.push(notes ? JSON.stringify(notes) : null);
                                tuPropsArr.push(Object.keys(tuProps).length > 0 ? JSON.stringify(tuProps) : null);
                                qs.push(q);
                                tss.push(ts);
                                tuOrders.push(idx);
                                ranks.push(null); // TMStore doesn't compute rank
                                affectedGuids.add(guid);
                            });

                            await client.query(/* sql */`
                                INSERT INTO ${tusTable}
                                    (store_id, guid, job_guid, rid, sid, nsrc, nsrc_flat, ntgt, ntgt_flat, notes, tu_props, q, ts, tu_order, rank)
                                SELECT * FROM UNNEST(
                                    $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
                                    $6::jsonb[], $7::text[], $8::jsonb[], $9::text[], $10::jsonb[],
                                    $11::jsonb[], $12::int[], $13::bigint[], $14::int[], $15::int[]
                                )
                                ON CONFLICT (guid, job_guid)
                                DO UPDATE SET
                                    store_id = EXCLUDED.store_id,
                                    rid = EXCLUDED.rid,
                                    sid = EXCLUDED.sid,
                                    nsrc = EXCLUDED.nsrc,
                                    nsrc_flat = EXCLUDED.nsrc_flat,
                                    ntgt = EXCLUDED.ntgt,
                                    ntgt_flat = EXCLUDED.ntgt_flat,
                                    notes = EXCLUDED.notes,
                                    tu_props = EXCLUDED.tu_props,
                                    q = EXCLUDED.q,
                                    ts = EXCLUDED.ts,
                                    tu_order = EXCLUDED.tu_order;
                            `, [storeIds, guids, jobGuidsArr, rids, sids, nsrcs, nsrcFlats, ntgts, ntgtFlats, notesArr, tuPropsArr, qs, tss, tuOrders, ranks]);

                            tuCount += tus.length;
                        }
                    }

                    // Update ranks for affected guids (new TUs might outrank existing ones)
                    if (affectedGuids.size > 0) {
                        await client.query(/* sql */`
                            UPDATE ${tusTable}
                            SET rank = t2.new_rank
                            FROM (
                                SELECT
                                    guid,
                                    job_guid,
                                    ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
                                FROM ${tusTable}
                                WHERE guid = ANY($1)
                            ) AS t2
                            WHERE
                                ${tusTable}.guid = t2.guid AND
                                ${tusTable}.job_guid = t2.job_guid;
                        `, [Array.from(affectedGuids)]);
                    }

                    await client.query('COMMIT');

                    if (tuCount > 0) {
                        logVerbose`Saved ${tuCount.toLocaleString()} ${[tuCount, 'TU', 'TUs']} in block ${blockId} of TM Store ${this.id} (${sourceLang} → ${targetLang})`;
                    }
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    client.release();
                }
            } else {
                // Delete block - remove all jobs and TUs for this block from this store
                const blockJobs = toc.blocks[blockId]?.jobs || [];
                if (blockJobs.length > 0) {
                    const jobGuids = blockJobs.map(([jg]) => jg);

                    const client = await this.#pool.connect();
                    try {
                        await client.query('BEGIN');

                        // Get affected guids before deletion for rank update
                        const { rows: affectedRows } = await client.query(/* sql */`
                            SELECT DISTINCT guid FROM ${tusTable}
                            WHERE store_id = $1 AND job_guid = ANY($2);
                        `, [this.#tmStoreId, jobGuids]);
                        const affectedGuids = affectedRows.map(r => r.guid);

                        // Delete TUs for this store
                        await client.query(/* sql */`
                            DELETE FROM ${tusTable}
                            WHERE store_id = $1 AND job_guid = ANY($2);
                        `, [this.#tmStoreId, jobGuids]);

                        // Delete jobs (only if they belong to this store)
                        await client.query(/* sql */`
                            DELETE FROM jobs
                            WHERE tm_store = $1 AND job_guid = ANY($2);
                        `, [this.#tmStoreId, jobGuids]);

                        // Update ranks for affected guids
                        if (affectedGuids.length > 0) {
                            await client.query(/* sql */`
                                UPDATE ${tusTable}
                                SET rank = t2.new_rank
                                FROM (
                                    SELECT
                                        guid,
                                        job_guid,
                                        ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
                                    FROM ${tusTable}
                                    WHERE guid = ANY($1)
                                ) AS t2
                                WHERE
                                    ${tusTable}.guid = t2.guid AND
                                    ${tusTable}.job_guid = t2.job_guid;
                            `, [affectedGuids]);
                        }

                        await client.query('COMMIT');
                        logVerbose`Deleted block ${blockId} from TM Store ${this.id}`;
                    } catch (e) {
                        await client.query('ROLLBACK');
                        throw e;
                    } finally {
                        client.release();
                    }
                } else {
                    logVerbose`Couldn't delete block ${blockId} from TM Store ${this.id} because it was not found`;
                }
            }
        };

        await cb(writeBlock);
    }
}
