import { logVerbose } from '@l10nmonster/core';
import { createSQLObjectTransformer, sanitizeTableName, flattenNormalizedSourceToOrdinal } from './pgUtils.js';

/** @typedef {import('@l10nmonster/core').TuDAL} TuDAL */

const sqlTransformer = createSQLObjectTransformer(
    ['nstr', 'nsrc', 'ntgt', 'notes', 'qa', 'tuProps', 'segProps'],
    ['tuProps', 'segProps']
);

/**
 * PostgreSQL implementation of TuDAL.
 * @implements {TuDAL}
 */
export class PgTuDAL {
    #pool;
    #sourceLang;
    #targetLang;
    #DAL;
    #tusTable;
    #indexesInitialized = false;
    #indexesPromise = null;
    #tableCreated = false;

    /**
     * @returns {string} Source language code
     */
    get sourceLang() {
        return this.#sourceLang;
    }

    /**
     * @returns {string} Target language code
     */
    get targetLang() {
        return this.#targetLang;
    }

    /**
     * @param {import('pg').Pool} pool - PostgreSQL pool
     * @param {string} sourceLang - Source language code
     * @param {string} targetLang - Target language code
     * @param {Object} DAL - DAL manager (for accessing channels)
     */
    constructor(pool, sourceLang, targetLang, DAL) {
        this.#pool = pool;
        this.#sourceLang = sourceLang;
        this.#targetLang = targetLang;
        this.#DAL = DAL;
        this.#tusTable = sanitizeTableName(`tus_${sourceLang}_${targetLang}`);
    }

    // ========== Helper Methods for Channel/Group Filtering ==========

    /**
     * Get list of segment tables that actually exist in the database.
     * Caches the result to avoid repeated queries.
     * @returns {Promise<Map<string, string>>} Map of channelId to table name
     */
    async #getExistingSegmentTables() {
        if (this.#existingSegmentTablesCache) {
            return this.#existingSegmentTablesCache;
        }

        const result = new Map();
        for (const channelId of this.#DAL.activeChannels) {
            const channelDAL = this.#DAL.channel(channelId);
            const tableName = channelDAL.segmentsTable;
            try {
                // Check if table exists
                const { rows } = await this.#pool.query(/* sql */`
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = LOWER($1)
                    LIMIT 1;
                `, [tableName]);
                if (rows.length > 0) {
                    result.set(channelId, tableName);
                }
            } catch {
                // Table doesn't exist, skip
            }
        }

        this.#existingSegmentTablesCache = result;
        return result;
    }

    /** @type {Map<string, string>|null} */
    #existingSegmentTablesCache = null;

    /**
     * Generate an EXISTS condition to filter for leveraged guids (those that exist in any segment table).
     * @param {string} guidColumn - The column name to check (e.g., 't.guid').
     * @param {string[]|null} channelFilter - Optional array of channel IDs to filter by.
     * @param {Map<string, string>} existingTables - Map of channelId to table name
     * @returns {string} SQL EXISTS condition or '1=0' if no segment tables.
     */
    #getLeveragedExistsCondition(guidColumn, channelFilter, existingTables) {
        const existsConditions = [];
        for (const [channelId, tableName] of existingTables) {
            if (channelFilter && !channelFilter.includes(channelId)) continue;
            existsConditions.push(`EXISTS (SELECT 1 FROM ${tableName} WHERE guid = ${guidColumn})`);
        }
        return existsConditions.length > 0 ? `(${existsConditions.join(' OR ')})` : '1=0';
    }

    /**
     * Generate CTE for joining with active segment tables to get channel and group info.
     * @param {string[]|null} channelFilter - Optional array of channel IDs to filter by.
     * @param {Map<string, string>} existingTables - Map of channelId to table name
     * @returns {string} SQL CTE fragment.
     */
    #getActiveGuidsCTE(channelFilter, existingTables) {
        const segmentTables = [];
        for (const [channelId, tableName] of existingTables) {
            if (channelFilter && !channelFilter.includes(channelId)) continue;
            segmentTables.push([tableName, channelId]);
        }
        // Handle the case when there are no active channels - provide an empty CTE
        const unionQuery = segmentTables.length > 0 ?
            segmentTables.map(([table, chId]) => `SELECT guid, '${chId}' AS channel, "group" FROM ${table}`).join(' UNION ALL ') :
            `SELECT NULL AS guid, NULL AS channel, NULL AS "group" WHERE FALSE`;
        return /* sql */`
            active_guids AS (
                ${unionQuery}
            )`;
    }

    /**
     * Look up channel and group for a list of guids by querying each segment table.
     * @param {string[]} guids - Array of guids to look up.
     * @param {Map<string, string>} existingTables - Map of channelId to table name
     * @returns {Promise<Map<string, {channel: string, group: string|null}>>}
     */
    async #lookupChannelAndGroup(guids, existingTables) {
        if (!guids.length) return new Map();

        const result = new Map();

        for (const [channelId, tableName] of existingTables) {
            try {
                const { rows } = await this.#pool.query(/* sql */`
                    SELECT guid, "group"
                    FROM ${tableName}
                    WHERE guid = ANY($1)
                `, [guids]);
                for (const row of rows) {
                    // Only set if not already found (first match wins)
                    if (!result.has(row.guid)) {
                        result.set(row.guid, { channel: channelId, group: row.group });
                    }
                }
            } catch {
                // If segment table doesn't exist, skip silently
            }
        }

        return result;
    }

    /**
     * Ensures the TUs table exists with primary key.
     */
    async #ensureTable() {
        if (this.#tableCreated) return;

        await this.#pool.query(/* sql */`
            CREATE TABLE IF NOT EXISTS ${this.#tusTable} (
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
        this.#tableCreated = true;
    }

    /**
     * Ensures all indexes are created.
     * Uses a promise lock to prevent race conditions with concurrent requests.
     */
    async ensureIndexes() {
        if (this.#indexesInitialized) return;

        // Use a promise lock to prevent concurrent index creation
        if (this.#indexesPromise) {
            return this.#indexesPromise;
        }

        this.#indexesPromise = this.#createIndexes();
        try {
            await this.#indexesPromise;
        } finally {
            this.#indexesPromise = null;
        }
    }

    /**
     * Internal method to create indexes.
     */
    async #createIndexes() {
        if (this.#indexesInitialized) return;

        await this.#ensureTable();

        logVerbose`Creating indexes for ${this.#tusTable} in parallel...`;
        const startTime = Date.now();

        // Define all indexes to create
        const indexQueries = [
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_job_guid_guid ON ${this.#tusTable} (job_guid, guid)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_guid_q_ts ON ${this.#tusTable} (guid, q DESC, ts DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_ts_rid_tu_order ON ${this.#tusTable} (ts DESC, rid, tu_order)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_q_ts ON ${this.#tusTable} (q, ts DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_guid_rank ON ${this.#tusTable} (guid, rank)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_rank_guid_q ON ${this.#tusTable} (rank, guid, q)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_nsrc_flat ON ${this.#tusTable} USING hash (nsrc_flat)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_nsrc_flat_trgm ON ${this.#tusTable} USING GIN (nsrc_flat gin_trgm_ops)`,
            `CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_ntgt_flat_trgm ON ${this.#tusTable} USING GIN (ntgt_flat gin_trgm_ops)`,
        ];

        try {
            // Create all indexes in parallel for faster bootstrap
            await Promise.all(indexQueries.map(query => this.#pool.query(query)));
            const elapsed = Date.now() - startTime;
            logVerbose`Created ${indexQueries.length} indexes for ${this.#tusTable} in ${elapsed}ms`;
        } catch (error) {
            // Ignore duplicate index errors from concurrent requests (error code 23505)
            // or race conditions on system catalog (pg_class_relname_nsp_index)
            if (error.code !== '23505' && !error.message.includes('pg_class_relname_nsp_index')) {
                throw error;
            }
            logVerbose`Indexes already created by concurrent request for ${this.#tusTable}`;
        }

        this.#indexesInitialized = true;
    }

    /**
     * Gets a single TU entry by GUID.
     * @param {string} guid
     * @returns {Promise<Object|undefined>}
     */
    async #getEntry(guid) {
        await this.ensureIndexes();
        const { rows } = await this.#pool.query(/* sql */`
            SELECT job_guid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tu_props
            FROM ${this.#tusTable}
            WHERE guid = $1 AND rank = 1
            LIMIT 1;
        `, [guid]);

        if (rows.length === 0) return undefined;

        return sqlTransformer.decode({
            jobGuid: rows[0].job_guid,
            guid: rows[0].guid,
            rid: rows[0].rid,
            sid: rows[0].sid,
            nsrc: rows[0].nsrc,
            ntgt: rows[0].ntgt,
            notes: rows[0].notes,
            q: rows[0].q,
            ts: rows[0].ts,
            tuProps: rows[0].tu_props,
        });
    }

    /**
     * Gets TU entries by GUIDs.
     * @param {string[]} guids
     * @returns {Promise<Record<string, Object>>}
     */
    async getEntries(guids) {
        const uniqueGuids = [...new Set(guids)];
        const entries = {};

        for (const guid of uniqueGuids) {
            const entry = await this.#getEntry(guid);
            if (entry) {
                entries[guid] = entry;
            }
        }

        return entries;
    }

    /**
     * Gets all TU entries for a job.
     * @param {string} jobGuid
     * @returns {Promise<Array>}
     */
    async getEntriesByJobGuid(jobGuid) {
        await this.ensureIndexes();
        const { rows } = await this.#pool.query(/* sql */`
            SELECT job_guid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tu_props
            FROM ${this.#tusTable}
            WHERE job_guid = $1
            ORDER BY tu_order;
        `, [jobGuid]);

        return rows.map(row => sqlTransformer.decode({
            jobGuid: row.job_guid,
            guid: row.guid,
            rid: row.rid,
            sid: row.sid,
            nsrc: row.nsrc,
            ntgt: row.ntgt,
            notes: row.notes,
            q: row.q,
            ts: row.ts,
            tuProps: row.tu_props,
        }));
    }

    /**
     * Batch upsert multiple job rows using UNNEST.
     * @param {Object[]} jobPropsList - Array of job properties
     * @param {string} tmStoreId
     * @param {Object} client - Pool client
     */
    async #upsertJobRowsBatch(jobPropsList, tmStoreId, client) {
        if (jobPropsList.length === 0) return;

        const sourceLangs = [];
        const targetLangs = [];
        const jobGuids = [];
        const statuses = [];
        const updatedAts = [];
        const translationProviders = [];
        const jobPropsJsons = [];
        const tmStores = [];

        for (const completeJobProps of jobPropsList) {
            const { jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, ...jobProps } = completeJobProps;
            sourceLangs.push(sourceLang);
            targetLangs.push(targetLang);
            jobGuids.push(jobGuid);
            statuses.push(status);
            updatedAts.push(updatedAt ?? new Date().toISOString());
            translationProviders.push(translationProvider);
            jobPropsJsons.push(JSON.stringify(jobProps));
            tmStores.push(tmStoreId);
        }

        await client.query(/* sql */`
            INSERT INTO jobs (source_lang, target_lang, job_guid, status, updated_at, translation_provider, job_props, tm_store)
            SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::jsonb[], $8::text[])
            ON CONFLICT (job_guid) DO UPDATE SET
                source_lang = EXCLUDED.source_lang,
                target_lang = EXCLUDED.target_lang,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at,
                translation_provider = EXCLUDED.translation_provider,
                job_props = EXCLUDED.job_props,
                tm_store = EXCLUDED.tm_store;
        `, [sourceLangs, targetLangs, jobGuids, statuses, updatedAts, translationProviders, jobPropsJsons, tmStores]);
    }

    /**
     * Batch size for bulk inserts to avoid memory issues with very large jobs.
     */
    static #BATCH_SIZE = 5000;

    /**
     * Inserts a batch of TUs where each TU includes its own jobGuid.
     * Used for cross-job batching in saveJobs.
     * @param {Array} tus - Array of TU objects with jobGuid property
     * @param {import('pg').PoolClient} client - Database client
     * @returns {Promise<string[]>} Array of guids that were inserted
     */
    async #insertTuBatchWithJobGuid(tus, client) {
        if (tus.length === 0) return [];

        const guids = [];
        const jobGuids = [];
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

        for (const tu of tus) {
            const { guid, jobGuid, rid, sid, nsrc, ntgt, notes, q, ts, tuOrder, ...tuProps } = tu;

            guids.push(guid);
            jobGuids.push(jobGuid);
            rids.push(rid);
            sids.push(sid);
            nsrcs.push(JSON.stringify(nsrc));
            nsrcFlats.push(flattenNormalizedSourceToOrdinal(nsrc));
            ntgts.push(JSON.stringify(ntgt));
            ntgtFlats.push(ntgt ? flattenNormalizedSourceToOrdinal(ntgt) : null);
            notesArr.push(notes ? JSON.stringify(notes) : null);
            tuPropsArr.push(Object.keys(tuProps).length > 0 ? JSON.stringify(tuProps) : null);
            qs.push(q);
            tss.push(ts);
            tuOrders.push(tuOrder);
            ranks.push(1);
        }

        await client.query(/* sql */`
            INSERT INTO ${this.#tusTable}
            (guid, job_guid, rid, sid, nsrc, nsrc_flat, ntgt, ntgt_flat, notes, tu_props, q, ts, tu_order, rank)
            SELECT * FROM UNNEST(
                $1::text[], $2::text[], $3::text[], $4::text[],
                $5::jsonb[], $6::text[], $7::jsonb[], $8::text[], $9::jsonb[],
                $10::jsonb[], $11::int[], $12::bigint[], $13::int[], $14::int[]
            )
            ON CONFLICT (guid, job_guid)
            DO UPDATE SET
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
        `, [guids, jobGuids, rids, sids, nsrcs, nsrcFlats, ntgts, ntgtFlats, notesArr, tuPropsArr, qs, tss, tuOrders, ranks]);

        return guids;
    }

    /**
     * Saves multiple jobs in a single transaction.
     * @param {Array<{jobProps: Object, tus: Array}>} jobs
     * @param {{ tmStoreId?: string, updateRank?: boolean }} [options]
     */
    async saveJobs(jobs, { tmStoreId, updateRank = true } = {}) {
        if (jobs.length === 0) return;

        const totalTus = jobs.reduce((sum, job) => sum + job.tus.length, 0);
        logVerbose`PgTuDAL.saveJobs: ${this.#tusTable} - ${jobs.length} jobs, ${totalTus} TUs`;

        await this.#ensureTable();

        // Collect all TUs across jobs with their job_guid
        const allTus = [];
        for (const { jobProps, tus } of jobs) {
            tus.forEach((tu, idx) => allTus.push({ ...tu, jobGuid: jobProps.jobGuid, tuOrder: idx }));
        }

        const startTime = Date.now();
        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');

            // Collect all job guids for batch operations
            const jobGuids = jobs.map(j => j.jobProps.jobGuid);

            // Batch upsert all job metadata
            logVerbose`PgTuDAL.saveJobs: upserting ${jobGuids.length} job metadata rows`;
            await this.#upsertJobRowsBatch(jobs.map(j => j.jobProps), tmStoreId, client);

            const affectedGuids = new Set();

            if (updateRank) {
                // Get all guids that will be affected by deleting these jobs' entries (single query)
                logVerbose`PgTuDAL.saveJobs: fetching affected guids for ${jobGuids.length} jobs`;
                const { rows: existingGuids } = await client.query(/* sql */`
                    SELECT guid FROM ${this.#tusTable} WHERE job_guid = ANY($1);
                `, [jobGuids]);
                existingGuids.forEach(row => affectedGuids.add(row.guid));

                // Delete existing entries for all jobs (single query)
                logVerbose`PgTuDAL.saveJobs: deleting old TUs for ${jobGuids.length} jobs`;
                await client.query(/* sql */`
                    DELETE FROM ${this.#tusTable} WHERE job_guid = ANY($1);
                `, [jobGuids]);
            }

            // Insert all TUs in batches
            const batchSize = PgTuDAL.#BATCH_SIZE;
            const numBatches = Math.ceil(allTus.length / batchSize);
            logVerbose`PgTuDAL.saveJobs: ${this.#tusTable} - inserting ${allTus.length} TUs in ${numBatches} batch(es)`;
            for (let i = 0; i < allTus.length; i += batchSize) {
                const batch = allTus.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;
                if (numBatches > 1) {
                    logVerbose`PgTuDAL.saveJobs: ${this.#tusTable} batch ${batchNum}/${numBatches} (${batch.length} TUs)`;
                }
                const insertedGuids = await this.#insertTuBatchWithJobGuid(batch, client);
                insertedGuids.forEach(guid => affectedGuids.add(guid));
            }

            // Update ranks for affected guids
            if (updateRank && affectedGuids.size > 0) {
                logVerbose`PgTuDAL.saveJobs: updating ranks for ${affectedGuids.size} affected guids`;
                await this.#updateRankForGuids(Array.from(affectedGuids), client);
            }

            await client.query('COMMIT');
            const elapsed = Date.now() - startTime;
            logVerbose`PgTuDAL.saveJobs: completed in ${elapsed}ms`;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Updates ranks for specific guids.
     * @param {string[]} guids
     * @param {import('pg').PoolClient} client
     */
    async #updateRankForGuids(guids, client) {
        if (guids.length === 0) return;

        await client.query(/* sql */`
            UPDATE ${this.#tusTable}
            SET rank = t2.new_rank
            FROM (
                SELECT
                    guid,
                    job_guid,
                    ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
                FROM ${this.#tusTable}
                WHERE guid = ANY($1)
            ) AS t2
            WHERE
                ${this.#tusTable}.guid = t2.guid AND
                ${this.#tusTable}.job_guid = t2.job_guid;
        `, [guids]);
    }

    /**
     * Deletes a job and its TUs.
     * @param {string} jobGuid
     */
    async deleteJob(jobGuid) {
        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');

            // Get guids to update ranks
            const { rows: affectedRows } = await client.query(/* sql */`
                SELECT guid FROM ${this.#tusTable} WHERE job_guid = $1;
            `, [jobGuid]);
            const affectedGuids = affectedRows.map(r => r.guid);

            // Delete TUs
            await client.query(/* sql */`
                DELETE FROM ${this.#tusTable} WHERE job_guid = $1;
            `, [jobGuid]);

            // Delete job
            await client.query(/* sql */`
                DELETE FROM jobs WHERE job_guid = $1;
            `, [jobGuid]);

            // Update ranks for remaining entries
            if (affectedGuids.length > 0) {
                await this.#updateRankForGuids(affectedGuids, client);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Gets exact matches for a normalized source.
     * @param {Array} nsrc
     * @returns {Promise<Array>}
     */
    async getExactMatches(nsrc) {
        await this.ensureIndexes();
        const flattenedSrc = flattenNormalizedSourceToOrdinal(nsrc);

        const { rows } = await this.#pool.query(/* sql */`
            SELECT job_guid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tu_props
            FROM ${this.#tusTable}
            WHERE nsrc_flat = $1 AND rank = 1;
        `, [flattenedSrc]);

        return rows.map(row => sqlTransformer.decode({
            jobGuid: row.job_guid,
            guid: row.guid,
            rid: row.rid,
            sid: row.sid,
            nsrc: row.nsrc,
            ntgt: row.ntgt,
            notes: row.notes,
            q: row.q,
            ts: row.ts,
            tuProps: row.tu_props,
        }));
    }

    /**
     * Deletes empty jobs.
     * @param {boolean} [dryrun]
     * @returns {Promise<number>}
     */
    async deleteEmptyJobs(dryrun) {
        if (dryrun) {
            const { rows } = await this.#pool.query(/* sql */`
                SELECT COUNT(*)::integer as count
                FROM jobs
                LEFT JOIN ${this.#tusTable} ON jobs.job_guid = ${this.#tusTable}.job_guid
                WHERE source_lang = $1 AND target_lang = $2 AND ${this.#tusTable}.guid IS NULL;
            `, [this.#sourceLang, this.#targetLang]);
            return rows[0].count;
        } else {
            const { rowCount } = await this.#pool.query(/* sql */`
                DELETE FROM jobs
                WHERE job_guid IN (
                    SELECT jobs.job_guid
                    FROM jobs
                    LEFT JOIN ${this.#tusTable} ON jobs.job_guid = ${this.#tusTable}.job_guid
                    WHERE source_lang = $1 AND target_lang = $2 AND ${this.#tusTable}.guid IS NULL
                );
            `, [this.#sourceLang, this.#targetLang]);
            return rowCount;
        }
    }

    /**
     * Gets TU keys over a certain rank.
     * @param {number} maxRank
     * @returns {Promise<Array<[string, string]>>}
     */
    async tuKeysOverRank(maxRank) {
        await this.ensureIndexes();
        const { rows } = await this.#pool.query(/* sql */`
            SELECT guid, job_guid FROM ${this.#tusTable} WHERE rank > $1;
        `, [maxRank]);
        return rows.map(row => [row.guid, row.job_guid]);
    }

    /**
     * Gets TU keys by quality.
     * @param {number} quality
     * @returns {Promise<Array<[string, string]>>}
     */
    async tuKeysByQuality(quality) {
        await this.ensureIndexes();
        const { rows } = await this.#pool.query(/* sql */`
            SELECT guid, job_guid FROM ${this.#tusTable} WHERE q = $1;
        `, [quality]);
        return rows.map(row => [row.guid, row.job_guid]);
    }

    /**
     * Deletes TUs by their keys.
     * @param {Array<[string, string]>} tuKeys
     * @returns {Promise<{ deletedTusCount: number; touchedJobsCount: number }>}
     */
    async deleteTuKeys(tuKeys) {
        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');

            let deletedTusCount = 0;
            const touchedJobGuids = new Set();

            for (const [guid, jobGuid] of tuKeys) {
                const { rowCount } = await client.query(/* sql */`
                    DELETE FROM ${this.#tusTable} WHERE guid = $1 AND job_guid = $2;
                `, [guid, jobGuid]);
                deletedTusCount += rowCount;
                if (rowCount > 0) {
                    touchedJobGuids.add(jobGuid);
                }
            }

            // Touch jobs
            if (touchedJobGuids.size > 0) {
                await client.query(/* sql */`
                    UPDATE jobs SET updated_at = $1 WHERE job_guid = ANY($2);
                `, [new Date().toISOString(), Array.from(touchedJobGuids)]);
            }

            await client.query('COMMIT');
            return { deletedTusCount, touchedJobsCount: touchedJobGuids.size };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Gets statistics for this language pair.
     * @returns {Promise<Array>}
     */
    async getStats() {
        await this.ensureIndexes();
        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                translation_provider as "translationProvider",
                status,
                COUNT(*)::integer AS "tuCount",
                COUNT(DISTINCT guid)::integer AS "distinctGuids",
                COUNT(DISTINCT job_guid)::integer AS "jobCount"
            FROM ${this.#tusTable}
            JOIN jobs ON ${this.#tusTable}.job_guid = jobs.job_guid
            WHERE
                source_lang = $1 AND target_lang = $2
            GROUP BY 1, 2
            ORDER BY 3 DESC;
        `, [this.#sourceLang, this.#targetLang]);
        return rows;
    }

    /**
     * Gets translated content status for a channel.
     * @param {Object} channelDAL - ChannelDAL instance
     * @returns {Promise<Array>}
     */
    async getTranslatedContentStatus(channelDAL) {
        await this.ensureIndexes();
        const segmentsTable = channelDAL.segmentsTable;

        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                COALESCE(seg.prj, 'default') as prj,
                (seg.plan ->> $3)::integer AS "minQ",
                tu.q,
                COUNT(DISTINCT seg.rid)::integer AS res,
                COUNT(*)::integer AS seg,
                SUM(seg.words)::integer AS words,
                SUM(seg.chars)::integer AS chars
            FROM
                ${this.#tusTable} tu
                INNER JOIN ${segmentsTable} seg
                    ON tu.guid = seg.guid
            WHERE tu.rank = 1
            AND seg.source_lang = $1
            AND seg.plan ->> $2 IS NOT NULL
            GROUP BY 1, 2, 3
            ORDER BY 2 DESC, 3 DESC;
        `, [this.#sourceLang, this.#targetLang, this.#targetLang]);

        return rows;
    }

    /**
     * Gets untranslated content status for a channel.
     * @param {Object} channelDAL - ChannelDAL instance
     * @returns {Promise<Array>}
     */
    async getUntranslatedContentStatus(channelDAL) {
        await this.ensureIndexes();
        const segmentsTable = channelDAL.segmentsTable;

        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                COALESCE(seg.prj, 'default') as prj,
                seg."group",
                (seg.plan ->> $3)::integer AS "minQ",
                COUNT(*)::integer AS seg,
                SUM(seg.words)::integer AS words,
                SUM(seg.chars)::integer AS chars
            FROM
                ${segmentsTable} seg
                LEFT JOIN ${this.#tusTable} tu
                    ON seg.guid = tu.guid AND tu.rank = 1
            WHERE seg.source_lang = $1
            AND seg.plan ->> $2 IS NOT NULL
            AND (tu.q IS NULL OR (tu.q != 0 AND tu.q < (seg.plan ->> $3)::integer))
            GROUP BY 1, 2, 3
            ORDER BY 1, 2, 3 DESC;
        `, [this.#sourceLang, this.#targetLang, this.#targetLang]);

        return rows;
    }

    /**
     * Gets untranslated content from a channel.
     * @param {Object} channelDAL - ChannelDAL instance
     * @param {{ limit?: number; prj?: string | string[] }} [options]
     * @returns {Promise<Array>}
     */
    async getUntranslatedContent(channelDAL, { limit = 100, prj } = {}) {
        await this.ensureIndexes();
        const segmentsTable = channelDAL.segmentsTable;
        const channelId = channelDAL.channelId;
        const prjArray = prj ? (Array.isArray(prj) ? prj : [prj]) : null;

        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                $5 as channel,
                COALESCE(prj, 'default') as prj,
                seg.rid,
                seg.sid,
                seg.guid,
                seg.nstr as nsrc,
                seg.notes,
                seg.mf,
                seg."group",
                seg.seg_props as "segProps",
                (seg.plan ->> $3)::integer AS "minQ",
                seg.words,
                seg.chars
            FROM
                ${segmentsTable} seg
                LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid AND tu.rank = 1
            WHERE
                source_lang = $1
                AND seg.plan ->> $2 IS NOT NULL
                AND (tu.q IS NULL OR (tu.q != 0 AND tu.q < (seg.plan ->> $3)::integer))
                AND ($6::text[] IS NULL OR COALESCE(prj, 'default') = ANY($6))
            ORDER BY prj, rid, seg_order
            LIMIT $4;
        `, [this.#sourceLang, this.#targetLang, this.#targetLang, limit, channelId, prjArray]);

        return rows.map(row => sqlTransformer.decode(row));
    }

    /**
     * Query source content with a WHERE condition.
     * @param {Object} channelDAL - ChannelDAL instance
     * @param {string} whereCondition
     * @returns {Promise<Array>}
     */
    async querySource(channelDAL, whereCondition) {
        await this.ensureIndexes();
        const segmentsTable = channelDAL.segmentsTable;
        const channelId = channelDAL.channelId;

        // Sanitize whereCondition - remove semicolons
        const sanitizedCondition = whereCondition.replaceAll(';', '');

        try {
            const { rows } = await this.#pool.query(/* sql */`
                SELECT
                    '${channelId}' as channel,
                    seg.prj,
                    seg.rid,
                    seg.sid,
                    seg.guid,
                    seg.nstr as nsrc,
                    tu.ntgt,
                    tu.q,
                    (seg.plan ->> $2)::integer AS "minQ",
                    seg.notes,
                    seg.mf,
                    seg."group",
                    seg.seg_props as "segProps",
                    seg.words,
                    seg.chars
                FROM ${segmentsTable} seg
                    LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid AND tu.rank = 1
                WHERE
                    source_lang = $1
                    AND seg.plan ->> $2 IS NOT NULL
                    AND ${sanitizedCondition}
                ORDER BY prj, rid, seg_order
                LIMIT 10000;
            `, [this.#sourceLang, this.#targetLang]);

            return rows.map(row => sqlTransformer.decode(row));
        } catch (error) {
            throw new Error(`Query source failed: ${error.message}`);
        }
    }

    /**
     * Query TUs by their GUIDs.
     * @param {string[]} guids
     * @param {Object|null} channelDAL - ChannelDAL instance or null
     * @returns {Promise<Array>}
     */
    async queryByGuids(guids, channelDAL) {
        await this.ensureIndexes();

        if (channelDAL) {
            const segmentsTable = channelDAL.segmentsTable;
            const channelId = channelDAL.channelId;

            const { rows } = await this.#pool.query(/* sql */`
                SELECT
                    $4 as channel,
                    seg.prj,
                    seg.rid,
                    seg.sid,
                    seg.guid,
                    seg.nstr as nsrc,
                    tu.ntgt,
                    tu.q,
                    jobs.translation_provider as "translationProvider",
                    tu.ts,
                    (seg.plan ->> $2)::integer AS "minQ",
                    seg.notes,
                    seg.mf,
                    seg."group",
                    seg.seg_props as "segProps",
                    seg.words,
                    seg.chars
                FROM
                    ${segmentsTable} seg
                    INNER JOIN (SELECT unnest($3::text[]) as guid) wanted ON seg.guid = wanted.guid
                    LEFT JOIN ${this.#tusTable} tu ON tu.guid = wanted.guid AND tu.rank = 1
                    LEFT JOIN jobs ON tu.job_guid = jobs.job_guid
                WHERE
                    seg.source_lang = $1
                    AND seg.plan ->> $2 IS NOT NULL
                ORDER BY prj, rid, seg_order;
            `, [this.#sourceLang, this.#targetLang, guids, channelId]);

            return rows.map(row => sqlTransformer.decode(row));
        } else {
            // For orphaned TUs
            const { rows } = await this.#pool.query(/* sql */`
                SELECT
                    rid,
                    sid,
                    tu.guid,
                    nsrc,
                    ntgt,
                    jobs.translation_provider as "translationProvider",
                    tu.ts,
                    tu.q,
                    tu.notes
                FROM
                    ${this.#tusTable} tu
                    INNER JOIN (SELECT unnest($1::text[]) as guid) wanted ON tu.guid = wanted.guid
                    JOIN jobs ON tu.job_guid = jobs.job_guid
                WHERE tu.rank = 1
                ORDER BY rid;
            `, [guids]);

            return rows.map(row => sqlTransformer.decode(row));
        }
    }

    /**
     * Search TUs with filtering and pagination.
     * @param {number} offset
     * @param {number} limit
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>}
     */
    // eslint-disable-next-line complexity
    async search(offset, limit, params) {
        await this.ensureIndexes();

        const {
            guid, nid, jobGuid, rid, sid, nsrc, ntgt, notes,
            tconf, maxRank = 10, onlyTNotes, q, minTS, maxTS,
            translationProvider, tmStore,
            channel, group, includeTechnicalColumns, onlyLeveraged
        } = params;

        // Determine if we need channel/group for filtering vs just display
        const channelArray = Array.isArray(channel) ? channel : null;
        const groupArray = Array.isArray(group) ? group : null;
        const needsChannelGroupFiltering = channelArray || groupArray;
        const needsChannelGroupDisplay = includeTechnicalColumns && !needsChannelGroupFiltering;

        // Get existing segment tables (cached after first call)
        const existingTables = (needsChannelGroupFiltering || needsChannelGroupDisplay || onlyLeveraged) ?
            await this.#getExistingSegmentTables() :
            new Map();

        // Generate EXISTS condition for onlyLeveraged filter (much faster than CTE INNER JOIN)
        const leveragedExistsCondition = onlyLeveraged ? this.#getLeveragedExistsCondition('t.guid', channelArray, existingTables) : null;

        // Build WHERE conditions (t = tus table, j = jobs table)
        const conditions = ['t.rank <= $3'];
        const queryParams = [this.#sourceLang, this.#targetLang, maxRank];
        let paramIndex = 4;

        if (guid) {
            conditions.push(`t.guid LIKE $${paramIndex++}`);
            queryParams.push(guid);
        }
        if (nid) {
            conditions.push(`t.tu_props->>'nid' LIKE $${paramIndex++}`);
            queryParams.push(nid);
        }
        if (jobGuid) {
            conditions.push(`t.job_guid LIKE $${paramIndex++}`);
            queryParams.push(jobGuid);
        }
        if (rid) {
            conditions.push(`t.rid LIKE $${paramIndex++}`);
            queryParams.push(rid);
        }
        if (sid) {
            conditions.push(`t.sid LIKE $${paramIndex++}`);
            queryParams.push(sid);
        }
        if (nsrc) {
            conditions.push(`t.nsrc_flat ILIKE $${paramIndex++}`);
            queryParams.push(nsrc);
        }
        if (ntgt) {
            conditions.push(`t.ntgt_flat ILIKE $${paramIndex++}`);
            queryParams.push(`%${ntgt}%`);
        }
        if (notes) {
            conditions.push(`t.notes::text LIKE $${paramIndex++}`);
            queryParams.push(`%${notes}%`);
        }
        if (onlyTNotes) {
            conditions.push(`t.tu_props->>'tnotes' IS NOT NULL`);
        }
        if (Array.isArray(tconf) && tconf.length > 0) {
            const tconfValues = tconf.map(Number).filter(t => !isNaN(t));
            if (tconfValues.length > 0) {
                conditions.push(`(t.tu_props->>'tconf')::integer = ANY($${paramIndex++}::integer[])`);
                queryParams.push(tconfValues);
            }
        }
        if (Array.isArray(q) && q.length > 0) {
            const qValues = q.map(Number).filter(v => !isNaN(v));
            if (qValues.length > 0) {
                conditions.push(`t.q = ANY($${paramIndex++}::integer[])`);
                queryParams.push(qValues);
            }
        }
        if (minTS) {
            conditions.push(`t.ts >= $${paramIndex++}`);
            queryParams.push(minTS);
        }
        if (maxTS) {
            conditions.push(`t.ts <= $${paramIndex++}`);
            queryParams.push(maxTS);
        }
        if (Array.isArray(translationProvider) && translationProvider.length > 0) {
            conditions.push(`j.translation_provider = ANY($${paramIndex++}::text[])`);
            queryParams.push(translationProvider);
        }
        if (Array.isArray(tmStore) && tmStore.length > 0) {
            const hasNull = tmStore.includes('__null__');
            const nonNull = tmStore.filter(ts => ts !== '__null__');
            const tmConditions = [];
            if (nonNull.length > 0) {
                tmConditions.push(`j.tm_store = ANY($${paramIndex++}::text[])`);
                queryParams.push(nonNull);
            }
            if (hasNull) {
                tmConditions.push('j.tm_store IS NULL');
            }
            if (tmConditions.length > 0) {
                conditions.push(`(${tmConditions.join(' OR ')})`);
            }
        }

        // Add leveraged filter
        if (leveragedExistsCondition) {
            conditions.push(leveragedExistsCondition);
        }

        // Add group filter (including 'Unknown' and 'Unassigned' as special values)
        if (groupArray && groupArray.length > 0 && needsChannelGroupFiltering) {
            const filterGroupUnknown = groupArray.includes('Unknown');
            const filterGroupUnassigned = groupArray.includes('Unassigned');
            const regularGroups = groupArray.filter(g => g !== 'Unknown' && g !== 'Unassigned');

            const groupConditions = [];
            if (filterGroupUnknown) {
                groupConditions.push('ag.channel IS NULL');
            }
            if (filterGroupUnassigned) {
                groupConditions.push('(ag.channel IS NOT NULL AND ag."group" IS NULL)');
            }
            if (regularGroups.length > 0) {
                groupConditions.push(`ag."group" = ANY($${paramIndex++}::text[])`);
                queryParams.push(regularGroups);
            }
            if (groupConditions.length > 0) {
                conditions.push(`(${groupConditions.join(' OR ')})`);
            }
        }

        // Build CTE section - only include active_guids CTE when filtering by channel/group
        const cteParts = [];
        if (needsChannelGroupFiltering) {
            cteParts.push(this.#getActiveGuidsCTE(channelArray, existingTables));
        }
        const withClause = cteParts.length > 0 ? `WITH ${cteParts.join(', ')}` : '';

        // Add limit and offset params
        const limitParamIdx = paramIndex++;
        const offsetParamIdx = paramIndex++;
        queryParams.push(limit, offset);

        const whereClause = conditions.join(' AND ');

        // Build join clause
        const joinClause = needsChannelGroupFiltering ?
            `${channelArray ? 'INNER' : 'LEFT'} JOIN active_guids ag ON t.guid = ag.guid` :
            '';

        // Build select columns
        const selectColumns = needsChannelGroupFiltering ?
            `ag.channel,
                CASE
                    WHEN ag.channel IS NULL THEN 'Unknown'
                    WHEN ag."group" IS NULL THEN 'Unassigned'
                    ELSE ag."group"
                END AS "group",` :
            '';

        const { rows } = await this.#pool.query(/* sql */`
            ${withClause}
            SELECT
                t.guid,
                t.job_guid as "jobGuid",
                ${selectColumns}
                t.rid,
                t.sid,
                t.nsrc,
                t.ntgt,
                t.notes,
                t.tu_props->>'nid' as nid,
                t.tu_props->>'tconf' as tconf,
                t.tu_props->>'tnotes' as tnotes,
                t.q,
                t.ts,
                j.translation_provider as "translationProvider",
                j.tm_store as "tmStore",
                t.rank = 1 as active,
                j.updated_at as "updatedAt"
            FROM ${this.#tusTable} t
            JOIN jobs j ON t.job_guid = j.job_guid
            ${joinClause}
            WHERE j.source_lang = $1 AND j.target_lang = $2 AND ${whereClause}
            ORDER BY t.ts DESC, t.rid, t.tu_order
            LIMIT $${limitParamIdx}
            OFFSET $${offsetParamIdx};
        `, queryParams);

        const decodedResults = rows.map(row => sqlTransformer.decode(row));

        // If we need channel/group for display only (not filtering), look them up separately
        // This is much faster than joining with a massive UNION ALL CTE
        if (needsChannelGroupDisplay && decodedResults.length > 0) {
            const guids = decodedResults.map(r => r.guid);
            const channelGroupMap = await this.#lookupChannelAndGroup(guids, existingTables);

            for (const result of decodedResults) {
                const info = channelGroupMap.get(result.guid);
                if (info) {
                    result.channel = info.channel;
                    result.group = info.group ?? 'Unassigned';
                } else {
                    result.channel = null;
                    result.group = 'Unknown';
                }
            }
        }

        return decodedResults;
    }

    /**
     * Look up TUs by exact conditions.
     * @param {{ guid?: string; nid?: string; rid?: string; sid?: string }} conditions
     * @returns {Promise<Array>}
     */
    async lookup({ guid, nid, rid, sid }) {
        await this.ensureIndexes();

        const whereConditions = ['rank = 1'];
        const params = [];
        let paramIndex = 1;

        if (guid) {
            whereConditions.push(`guid = $${paramIndex++}`);
            params.push(guid);
        }
        if (nid) {
            whereConditions.push(`tu_props->>'nid' = $${paramIndex++}`);
            params.push(nid);
        }
        if (rid) {
            whereConditions.push(`rid = $${paramIndex++}`);
            params.push(rid);
        }
        if (sid) {
            whereConditions.push(`sid = $${paramIndex++}`);
            params.push(sid);
        }

        const { rows } = await this.#pool.query(/* sql */`
            SELECT rid, sid, guid, nsrc, ntgt, q, notes
            FROM ${this.#tusTable}
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY q DESC, ts DESC
            LIMIT 10;
        `, params);

        return rows.map(row => sqlTransformer.decode(row));
    }

    /**
     * Gets distinct values for low-cardinality columns.
     * @returns {Promise<Object>} Object with arrays of available values per column
     */
    async getLowCardinalityColumns() {
        await this.ensureIndexes();

        /** @type {Record<string, unknown[]>} */
        const enumValues = {};

        // Get q values
        const { rows: qRows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT q FROM ${this.#tusTable} WHERE q IS NOT NULL ORDER BY q;
        `);
        if (qRows.length > 0) {
            enumValues.q = qRows.map(r => r.q);
        }

        // Get tconf values
        const { rows: tconfRows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT tu_props->>'tconf' as tconf
            FROM ${this.#tusTable}
            WHERE tu_props->>'tconf' IS NOT NULL
            ORDER BY tconf;
        `);
        if (tconfRows.length > 0) {
            enumValues.tconf = tconfRows.map(r => r.tconf);
        }

        // Get translation provider values
        const { rows: tpRows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT translation_provider
            FROM jobs
            WHERE translation_provider IS NOT NULL
                AND source_lang = $1 AND target_lang = $2;
        `, [this.#sourceLang, this.#targetLang]);
        if (tpRows.length > 0) {
            enumValues.translationProvider = tpRows.map(r => r.translation_provider);
        }

        // Get tm store values
        const { rows: tsRows } = await this.#pool.query(/* sql */`
            SELECT DISTINCT COALESCE(tm_store, '__null__') as tm_store
            FROM jobs
            WHERE source_lang = $1 AND target_lang = $2;
        `, [this.#sourceLang, this.#targetLang]);
        if (tsRows.length > 0) {
            enumValues.tmStore = tsRows.map(r => r.tm_store);
        }

        // Get group values from existing segment tables
        const groupValues = new Set(['Unknown', 'Unassigned']);
        const existingTables = await this.#getExistingSegmentTables();
        for (const tableName of existingTables.values()) {
            try {
                const { rows: groupRows } = await this.#pool.query(/* sql */`
                    SELECT DISTINCT "group" FROM ${tableName} WHERE "group" IS NOT NULL;
                `);
                groupRows.forEach(r => groupValues.add(r.group));
            } catch {
                // Ignore if table doesn't exist
            }
        }
        if (groupValues.size > 0) {
            enumValues.group = Array.from(groupValues);
        }

        return enumValues;
    }

    /**
     * Gets quality score distribution.
     * @returns {Promise<Array<{ q: number; count: number }>>}
     */
    async getQualityDistribution() {
        await this.ensureIndexes();
        const { rows } = await this.#pool.query(/* sql */`
            SELECT q, COUNT(*)::integer as count
            FROM ${this.#tusTable}
            GROUP BY q
            ORDER BY q;
        `);
        return rows;
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

    // ========== Job Query Methods ==========

    /**
     * Gets job table of contents.
     * @returns {Promise<Array>}
     */
    async getJobTOC() {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT job_guid as "jobGuid", status, translation_provider as "translationProvider", updated_at as "updatedAt"
            FROM jobs
            WHERE source_lang = $1 AND target_lang = $2
            ORDER BY updated_at DESC;
        `, [this.#sourceLang, this.#targetLang]);
        return rows;
    }

    /**
     * Gets a job by its GUID.
     * @param {string} jobGuid
     * @returns {Promise<Object|undefined>}
     */
    async getJob(jobGuid) {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                job_guid as "jobGuid",
                job_props,
                source_lang as "sourceLang",
                target_lang as "targetLang",
                translation_provider as "translationProvider",
                status,
                updated_at as "updatedAt"
            FROM jobs WHERE job_guid = $1 AND source_lang = $2 AND target_lang = $3;
        `, [jobGuid, this.#sourceLang, this.#targetLang]);

        if (rows.length === 0) return undefined;

        const { job_props, ...basicProps } = rows[0];
        return { ...basicProps, ...(job_props || {}) };
    }

    /**
     * Gets job count.
     * @returns {Promise<number>}
     */
    async getJobCount() {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT count(*)::integer as count FROM jobs WHERE source_lang = $1 AND target_lang = $2;
        `, [this.#sourceLang, this.#targetLang]);
        return rows[0].count;
    }

    /**
     * Gets job statistics.
     * @returns {Promise<Array>}
     */
    async getJobStats() {
        const { rows } = await this.#pool.query(/* sql */`
            SELECT
                source_lang as "sourceLang",
                target_lang as "targetLang",
                tm_store as "tmStore",
                COUNT(*)::integer as "jobCount",
                MAX(updated_at) as "lastUpdatedAt"
            FROM jobs
            WHERE source_lang = $1 AND target_lang = $2
            GROUP BY 1, 2, 3
            ORDER BY 5 DESC;
        `, [this.#sourceLang, this.#targetLang]);
        return rows;
    }

    /**
     * Sets the TM store for a job.
     * @param {string} jobGuid
     * @param {string} tmStoreId
     */
    async setJobTmStore(jobGuid, tmStoreId) {
        await this.#pool.query(/* sql */`
            UPDATE jobs SET tm_store = $1 WHERE job_guid = $2 AND source_lang = $3 AND target_lang = $4;
        `, [tmStoreId, jobGuid, this.#sourceLang, this.#targetLang]);
    }

    /**
     * Gets job deltas between local DB and remote TOC.
     * @param {Object} toc
     * @param {string} storeId
     * @returns {Promise<Array>}
     */
    async getJobDeltas(toc, storeId) {
        // Create temporary table with TOC data
        const client = await this.#pool.connect();
        try {
            await client.query('BEGIN');

            // Create temp table for TOC
            await client.query(/* sql */`
                CREATE TEMP TABLE IF NOT EXISTS last_toc (
                    block_id TEXT,
                    modified TEXT,
                    job_guid TEXT,
                    updated_at TEXT
                ) ON COMMIT DROP;
            `);

            await client.query('DELETE FROM last_toc;');

            // Populate from TOC
            if (toc && toc.blocks && toc.v === 1) {
                for (const [blockId, blockProps] of Object.entries(toc.blocks)) {
                    const { modified, jobs } = blockProps;
                    for (const [jobGuid, updatedAt] of jobs) {
                        await client.query(/* sql */`
                            INSERT INTO last_toc (block_id, modified, job_guid, updated_at)
                            VALUES ($1, $2, $3, $4);
                        `, [blockId, modified, jobGuid, updatedAt]);
                    }
                }
            }

            const { rows } = await client.query(/* sql */`
                SELECT
                    tm_store as "tmStore",
                    block_id as "blockId",
                    j.job_guid as "localJobGuid",
                    lt.job_guid as "remoteJobGuid",
                    j.updated_at as "localUpdatedAt",
                    lt.updated_at as "remoteUpdatedAt"
                FROM (
                    SELECT tm_store, job_guid, updated_at
                    FROM jobs
                    WHERE source_lang = $1 AND target_lang = $2
                ) j
                FULL JOIN last_toc lt USING (job_guid)
                WHERE j.updated_at != lt.updated_at
                   OR j.updated_at IS NULL
                   OR lt.updated_at IS NULL
                   OR (j.tm_store IS NOT NULL AND j.tm_store != $3);
            `, [this.#sourceLang, this.#targetLang, storeId]);

            await client.query('COMMIT');
            return rows;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Gets valid job IDs for a block.
     * @param {Object} toc
     * @param {string} blockId
     * @param {string} storeId
     * @returns {Promise<string[]>}
     */
    async getValidJobIds(toc, blockId, storeId) {
        // Filter TOC for the specific block
        const blockJobs = toc?.blocks?.[blockId]?.jobs || [];

        if (blockJobs.length === 0) return [];

        const jobGuids = blockJobs.map(([jobGuid]) => jobGuid);

        const { rows } = await this.#pool.query(/* sql */`
            SELECT job_guid
            FROM jobs
            WHERE source_lang = $1 AND target_lang = $2
                AND job_guid = ANY($3)
                AND tm_store = $4;
        `, [this.#sourceLang, this.#targetLang, jobGuids, storeId]);

        return rows.map(r => r.job_guid);
    }
}
