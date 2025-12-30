import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { createSQLObjectTransformer } from './index.js';

/** @typedef {import('../interfaces.js').TuDAL} TuDALInterface */

const sqlTransformer = createSQLObjectTransformer(['nstr', 'nsrc', 'ntgt', 'notes', 'qa', 'tuProps', 'segProps'], ['tuProps', 'segProps']);

/** @implements {TuDALInterface} */
export class TuDAL {
    #db;
    #sourceLang;
    #targetLang;
    #DAL;
    #tusTable;
    #stmt = {}; // prepared statements
    #flatSrcIdxInitialized = false; // used to add the index as late as possible
    #indexesInitialized = false; // used to defer index creation until first read query
    #rankIndexInitialized = false; // used to defer rank index creation until first rank update
    #lastTOC = {}; // for job delta queries (virtual table)

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
     * @param {Object} db - Database connection
     * @param {string} sourceLang - Source language code
     * @param {string} targetLang - Target language code
     * @param {Object} DAL - DAL manager (for accessing channels)
     */
    constructor(db, sourceLang, targetLang, DAL) {
        this.#db = db;
        this.#sourceLang = sourceLang;
        this.#targetLang = targetLang;
        this.#DAL = DAL;
        this.#tusTable = `tus_${sourceLang}_${targetLang}`.replace(/[^a-zA-Z0-9_]/g, '_');

        // Create TUs table - indexes are deferred until first read query for bulk insert performance
        this.#db.exec(/* sql */`
            CREATE TABLE IF NOT EXISTS ${this.#tusTable} (
                guid TEXT NOT NULL,
                jobGuid TEXT NOT NULL,
                rid TEXT,
                sid TEXT,
                nsrc TEXT,
                ntgt TEXT,
                notes TEXT,
                tuProps TEXT,
                q INTEGER,
                ts INTEGER,
                tuOrder INTEGER,
                rank INTEGER
            );
        `);

        // Create jobs table (per-shard, scoped to this language pair in queries)
        this.#db.exec(/* sql */`
            CREATE TABLE IF NOT EXISTS jobs(
                jobGuid TEXT NOT NULL,
                sourceLang TEXT NOT NULL,
                targetLang TEXT NOT NULL,
                translationProvider TEXT,
                status TEXT,
                updatedAt TEXT,
                jobProps TEXT,
                tmStore TEXT,
                PRIMARY KEY (jobGuid)
            ) WITHOUT ROWID;
            CREATE INDEX IF NOT EXISTS idx_jobs_sourceLang_targetLang_translationProvider_status_jobGuid ON jobs (sourceLang, targetLang, translationProvider, status, jobGuid);
        `);

        // Virtual table for job delta queries
        const rows = (function *unrollJobs() {
            // Skip if TOC not yet set (getJobDeltas sets it before query)
            if (!this.#lastTOC || !this.#lastTOC.blocks) {
                return;
            }
            if (this.#lastTOC.v !== 1) {
                throw new Error(`Invalid TOC version: ${this.#lastTOC.v}`);
            }
            for (const [blockId, blockProps] of Object.entries(this.#lastTOC.blocks)) {
                const { modified, jobs } = blockProps;
                for (const [ jobGuid, updatedAt ] of jobs) {
                    yield { blockId, modified, jobGuid, updatedAt };
                }
            }
        }).bind(this);
        try {
            db.table('last_toc', {
                columns: ['blockId', 'modified', 'jobGuid', 'updatedAt'],
                rows,
            });
        } catch {
            // Table may already exist from another TuDAL instance in the same DB
        }

        db.function(
            'flattenNormalizedSourceToOrdinal',
            { deterministic: true },
            nsrc => {
                if (nsrc === null || nsrc === undefined) return null;
                const parsed = JSON.parse(nsrc);
                if (!Array.isArray(parsed)) return null;
                return utils.flattenNormalizedSourceToOrdinal(parsed);
            }
        );
    }

    /**
     * Ensures all indexes are created. Called before read operations.
     * Indexes are deferred to improve bulk insert performance (e.g., tm_syncdown on empty DB).
     */
    #ensureRankIndexes() {
        if (this.#rankIndexInitialized) return;
        logVerbose`Creating rank indexes for table ${this.#tusTable}...`;
        this.#db.exec(/* sql */`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_${this.#tusTable}_guid_jobGuid ON ${this.#tusTable} (guid, jobGuid);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_jobGuid_guid ON ${this.#tusTable} (jobGuid, guid);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_guid_q_ts ON ${this.#tusTable} (guid, q DESC, ts DESC);
        `);
        this.#rankIndexInitialized = true;
    }

    #ensureIndexes() {
        if (this.#indexesInitialized) return;
        this.#ensureRankIndexes();
        logVerbose`Creating other indexes for table ${this.#tusTable}...`;
        this.#db.exec(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_ts_rid_tuOrder ON ${this.#tusTable} (ts DESC, rid, tuOrder);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_q_ts ON ${this.#tusTable} (q, ts DESC);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_tconf_ts ON ${this.#tusTable} (tuProps->>'$.tconf', ts DESC);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_guid_rank ON ${this.#tusTable} (guid, rank);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_rank_guid_q ON ${this.#tusTable} (rank, guid, q);
        `);
        this.#indexesInitialized = true;
    }

    /**
     * Get the segments table name for a channel.
     * @param {import('../interfaces.js').ChannelDAL|string} channelDAL - ChannelDAL object or channelId string (TM worker mode)
     * @returns {{tableName: string, channelId: string}}
     */
    #getSegmentsTableInfo(channelDAL) {
        if (typeof channelDAL === 'string') {
            // TM worker mode: use ATTACH table reference (source DB attached as 'source')
            const channelId = channelDAL;
            const tableName = `source.segments_${channelId}`.replace(/[^a-zA-Z0-9_.]/g, '_');
            return { tableName, channelId };
        }
        // Direct mode: use ChannelDAL's table name
        return { tableName: channelDAL.segmentsTable, channelId: channelDAL.channelId };
    }

    #getActiveGuidsCTE(channelList) {
        const segmentTables = [];
        for (const channelId of this.#DAL.activeChannels) {
            if (channelList && !channelList.includes(channelId)) continue;
            const channelDAL = this.#DAL.channel(channelId);
            segmentTables.push([channelDAL.segmentsTable, channelId]);
        }
        // Handle the case when there are no active channels - provide an empty CTE
        const unionQuery = segmentTables.length > 0 ?
            segmentTables.map(([table, channelId]) => `SELECT guid, '${channelId}' AS channel, "group" FROM ${table}`).join(' UNION ALL ') :
            `SELECT NULL AS guid, NULL AS channel, NULL AS "group" WHERE 0`; // Empty result set
        return /* sql */`
            active_guids AS (
                ${unionQuery}
            )
        `;
    }

    /**
     * Generate an EXISTS condition to filter for leveraged guids (those that exist in any segment table).
     * Uses OR'd EXISTS subqueries which is much faster than UNION ALL CTE because it can short-circuit.
     * @param {string} guidColumn - The column name to check (e.g., 'guid' or 'tus.guid').
     * @param {string[]|null} channelFilter - Optional array of channel IDs to filter by.
     * @returns {string} SQL EXISTS condition or '1=1' if no segment tables.
     */
    #getLeveragedExistsCondition(guidColumn, channelFilter) {
        const existsConditions = [];
        for (const channelId of this.#DAL.activeChannels) {
            if (channelFilter && !channelFilter.includes(channelId)) continue;
            const channelDAL = this.#DAL.channel(channelId);
            existsConditions.push(`EXISTS (SELECT 1 FROM ${channelDAL.segmentsTable} WHERE guid = ${guidColumn})`);
        }
        return existsConditions.length > 0 ? `(${existsConditions.join(' OR ')})` : '1=0';
    }

    /**
     * Look up channel and group for a list of guids by querying each segment table.
     * This is much faster than a UNION ALL CTE when we only need to look up a small set of guids.
     * @param {string[]} guids - Array of guids to look up.
     * @param {string[]|null} channelFilter - Optional array of channel IDs to filter by.
     * @returns {Map<string, {channel: string, group: string|null}>} Map of guid to channel/group info.
     */
    #lookupChannelAndGroup(guids, channelFilter) {
        if (!guids.length) return new Map();

        const result = new Map();
        const guidsJson = JSON.stringify(guids);

        for (const channelId of this.#DAL.activeChannels) {
            if (channelFilter && !channelFilter.includes(channelId)) continue;
            const channelDAL = this.#DAL.channel(channelId);
            try {
                const stmt = this.#db.prepare(/* sql */`
                    SELECT guid, "group"
                    FROM ${channelDAL.segmentsTable}
                    WHERE guid IN (SELECT value FROM JSON_EACH(?))
                `);
                const rows = stmt.all(guidsJson);
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

    #getEntry(guid) {
        this.#ensureIndexes();
        this.#stmt.getEntry ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps
            FROM ${this.#tusTable}
            WHERE guid = ? AND rank = 1
            LIMIT 1;
        `);
        const tuRow = this.#stmt.getEntry.get(guid);
        return tuRow ? sqlTransformer.decode(tuRow) : undefined;
    }

    /**
     * Gets TU entries by GUIDs.
     * @param {string[]} guids - GUIDs to retrieve.
     * @returns {Promise<Record<string, import('../interfaces.js').TU>>} Map of GUID to TU.
     */
    async getEntries(guids) {
        const uniqueGuids = new Set(guids);

        /** @type {Record<string, import('../interfaces.js').TU>} */
        const entries = {};
        for (const guid of uniqueGuids) {
            const entry = this.#getEntry(guid);
            entry && (entries[guid] = entry);
        }
        return entries;
    }

    async getEntriesByJobGuid(jobGuid) {
        this.#ensureIndexes();
        this.#stmt.getEntriesByJobGuid ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps
            FROM ${this.#tusTable}
            WHERE jobGuid = ?
            ORDER BY tuOrder;
        `);
        const tuRows = this.#stmt.getEntriesByJobGuid.all(jobGuid);
        return tuRows.map(sqlTransformer.decode);
    }

    #deleteEntriesByJobGuid(jobGuid) {
        this.#stmt.deleteEntriesByJobGuid ??= this.#db.prepare(`DELETE FROM ${this.#tusTable} WHERE jobGuid = ?`);
        return this.#stmt.deleteEntriesByJobGuid.run(jobGuid);
    }

    #setEntry(tu, upsert = true) {
        let statement;
        if (upsert) {
            this.#stmt.upsertEntry ??= this.#db.prepare(/* sql */`
                INSERT INTO ${this.#tusTable} (guid, jobGuid, rid, sid, nsrc, ntgt, notes, tuProps, q, ts, tuOrder, rank)
                VALUES (@guid, @jobGuid, @rid, @sid, @nsrc, @ntgt, @notes, @tuProps, @q, @ts, @tuOrder, 1)
                ON CONFLICT (jobGuid, guid)
                DO UPDATE SET
                    rid = excluded.rid,
                    sid = excluded.sid,
                    nsrc = excluded.nsrc,
                    ntgt = excluded.ntgt,
                    notes = excluded.notes,
                    tuProps = excluded.tuProps,
                    q = excluded.q,
                    ts = excluded.ts,
                    tuOrder = excluded.tuOrder
                WHERE excluded.jobGuid = ${this.#tusTable}.jobGuid AND excluded.guid = ${this.#tusTable}.guid
            ;`);
            statement = this.#stmt.upsertEntry;
        } else {
            this.#stmt.insertEntry ??= this.#db.prepare(/* sql */`
                INSERT INTO ${this.#tusTable} (guid, jobGuid, rid, sid, nsrc, ntgt, notes, tuProps, q, ts, tuOrder, rank)
                VALUES (@guid, @jobGuid, @rid, @sid, @nsrc, @ntgt, @notes, @tuProps, @q, @ts, @tuOrder, 1);
            `);
            statement = this.#stmt.insertEntry;
        }
        // select properties are extracted so that they can be queried
        const { jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuOrder, ...tuProps } = tu;
        const result = statement.run(sqlTransformer.encode({
            jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuOrder, tuProps // TODO: populate inflight?
        }));
        if (result.changes !== 1) {
            throw new Error(`Expecting to change a row but changed: ${result.changes}`);
        }
    }

    #updateRank(jobGuid, includeJob) {
        this.#stmt.updateRank ??= this.#db.prepare(/* sql */`
            UPDATE ${this.#tusTable}
            SET rank = t2.new_rank
            FROM (
                SELECT
                    guid,
                    jobGuid,
                    ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
                FROM
                    ${this.#tusTable}
                WHERE
                    guid in (SELECT guid FROM ${this.#tusTable} WHERE jobGuid = @jobGuid)
                    AND (jobGuid != @jobGuid OR @includeJob = 1)
            ) AS t2
            WHERE
                ${this.#tusTable}.guid = t2.guid AND
                ${this.#tusTable}.jobGuid = t2.jobGuid;
        `);
        return this.#stmt.updateRank.run({jobGuid, includeJob: includeJob ? 1 : 0});
    }

    #getGuidsForJob(jobGuid) {
        this.#stmt.getGuidsForJob ??= this.#db.prepare(/* sql */`
            SELECT guid FROM ${this.#tusTable} WHERE jobGuid = ?;
        `).pluck();
        return this.#stmt.getGuidsForJob.all(jobGuid);
    }

    #updateRankForGuids(guids) {
        if (guids.length === 0) return;
        this.#stmt.updateRankForGuids ??= this.#db.prepare(/* sql */`
            UPDATE ${this.#tusTable}
            SET rank = t2.new_rank
            FROM (
                SELECT
                    guid,
                    jobGuid,
                    ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
                FROM ${this.#tusTable}
                WHERE guid IN (SELECT value FROM json_each(?))
            ) AS t2
            WHERE
                ${this.#tusTable}.guid = t2.guid AND
                ${this.#tusTable}.jobGuid = t2.jobGuid;
        `);
        return this.#stmt.updateRankForGuids.run(JSON.stringify(guids));
    }

    /**
     * Update ranks for all TUs in the table.
     * Optimized with fast path for single-jobGuid guids and window function for multi-jobGuid guids.
     */
    async #updateAllRanks() {
        this.#ensureRankIndexes();
        logVerbose`Updating all ranks for table ${this.#tusTable}...`;

        // Fast path: single jobGuid per guid, just set rank = 1
        const fastResult = this.#db.prepare(/* sql */`
            UPDATE ${this.#tusTable}
            SET rank = 1
            WHERE guid IN (
                SELECT guid FROM ${this.#tusTable}
                GROUP BY guid HAVING COUNT(*) = 1
            ) AND rank != 1;
        `).run();
        logVerbose`Unique guids: updated ${fastResult.changes} rows`;

        // Slow path: multiple jobGuids per guid, use window function
        const slowResult = this.#db.prepare(/* sql */`
            UPDATE ${this.#tusTable}
            SET rank = t2.new_rank
            FROM (
                SELECT guid, jobGuid,
                    ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as new_rank
                FROM ${this.#tusTable}
                WHERE guid IN (
                    SELECT guid FROM ${this.#tusTable}
                    GROUP BY guid HAVING COUNT(*) > 1
                )
            ) AS t2
            WHERE ${this.#tusTable}.guid = t2.guid
              AND ${this.#tusTable}.jobGuid = t2.jobGuid
              AND ${this.#tusTable}.rank != t2.new_rank;
        `).run();
        logVerbose`Duplicate guids: updated ${slowResult.changes} rows`;
    }

    /**
     * Runs a callback in bootstrap mode with deferred index creation.
     * Automatically creates indexes and updates ranks when the callback completes.
     * @template T
     * @param {() => Promise<T>} callback - The bootstrap operation to run.
     * @returns {Promise<T>} The result of the callback.
     */
    async withBootstrapMode(callback) {
        try {
            return await callback();
        } finally {
            this.#ensureRankIndexes();
            await this.#updateAllRanks();
        }
    }

    /**
     * Upserts job metadata (insert or update).
     * @param {Object} completeJobProps - Complete job properties including jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, and other props.
     * @param {string} [tmStoreId] - Optional TM store ID.
     */
    #upsertJobRow(completeJobProps, tmStoreId) {
        this.#stmt.upsertJob ??= this.#db.prepare(/* sql */`
            INSERT INTO jobs (sourceLang, targetLang, jobGuid, status, updatedAt, translationProvider, jobProps, tmStore)
            VALUES (@sourceLang, @targetLang, @jobGuid, @status, @updatedAt, @translationProvider, @jobProps, @tmStoreId)
            ON CONFLICT (jobGuid) DO UPDATE SET
                sourceLang = excluded.sourceLang,
                targetLang = excluded.targetLang,
                status = excluded.status,
                updatedAt = excluded.updatedAt,
                translationProvider = excluded.translationProvider,
                jobProps = excluded.jobProps,
                tmStore = excluded.tmStore
            WHERE excluded.jobGuid = jobs.jobGuid;
        `);
        const { jobGuid, sourceLang, targetLang, status, updatedAt, translationProvider, ...jobProps } = completeJobProps;
        const result = this.#stmt.upsertJob.run({
            jobGuid,
            sourceLang,
            targetLang,
            status,
            updatedAt: updatedAt ?? new Date().toISOString(),
            translationProvider,
            jobProps: JSON.stringify(jobProps),
            tmStoreId
        });
        if (result.changes !== 1) {
            throw new Error(`Expecting to change a row but changed ${result}`);
        }
    }

    /**
     * Deletes a job's metadata from the jobs table.
     * @param {string} jobGuid - Job identifier to delete.
     */
    #deleteJobRow(jobGuid) {
        this.#stmt.deleteJobRow ??= this.#db.prepare(/* sql */`
            DELETE FROM jobs WHERE jobGuid = ?;
        `);
        this.#stmt.deleteJobRow.run(jobGuid);
    }

    /**
     * Saves multiple jobs in a single transaction.
     * @param {Array<{jobProps: Object, tus: Array}>} jobs - Array of jobs to save
     * @param {Object} [options] - Options
     * @param {string} [options.tmStoreId] - TM store ID to associate with saved jobs.
     * @param {boolean} [options.updateRank = true] - Whether to update ranks for the affected guids.
     */
    async saveJobs(jobs, { tmStoreId, updateRank = true } = {}) {
        if (jobs.length === 0) return;

        this.#db.transaction(() => {
            logVerbose`Starting transaction to save ${jobs.length} jobs to ${this.#tusTable}...`;

            // Ensure rank-related indexes exist for getGuidsForJob and updateRankForGuids
            updateRank && this.#ensureRankIndexes();

            const affectedGuids = new Set();

            for (const { jobProps, tus } of jobs) {
                // Upsert job metadata in the same transaction (same DB, atomic)
                this.#upsertJobRow(jobProps, tmStoreId);

                if (updateRank) {
                // Collect guids that will be affected by deleting this job's entries
                    for (const guid of this.#getGuidsForJob(jobProps.jobGuid)) {
                        affectedGuids.add(guid);
                    }
                    this.#deleteEntriesByJobGuid(jobProps.jobGuid);
                }

                tus.forEach((tu, tuOrder) => {
                    this.#setEntry({
                        ...tu,
                        jobGuid: jobProps.jobGuid,
                        tuOrder,
                    }, updateRank); // insert if updateRank is false (bootstrap mode)
                    // Collect guids from newly inserted entries
                    affectedGuids.add(tu.guid);
                });
            }
            logVerbose`Saved ${affectedGuids.size.toLocaleString()} TUs for ${jobs.length.toLocaleString()} jobs`;

            if (updateRank) {
            // Batch update ranks for all affected guids at once
                this.#updateRankForGuids(Array.from(affectedGuids));
                logVerbose`Updated ranks for ${affectedGuids.size.toLocaleString()} guids`;
            }
        })();

        logVerbose`Transaction completed`;
    }

    async deleteJob(jobGuid) {
        this.#db.transaction(() => {
            this.#updateRank(jobGuid, false); // we need to update the rank for the job before deleting the entries
            this.#deleteEntriesByJobGuid(jobGuid);
            // Delete job metadata in the same transaction (same DB, atomic)
            this.#deleteJobRow(jobGuid);
        })();
    }

    async getExactMatches(nsrc) {
        this.#ensureIndexes();
        this.#stmt.createFlatSrcIdx ??= this.#db.prepare(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_flatSrc
            ON ${this.#tusTable} (flattenNormalizedSourceToOrdinal(nsrc));
        `);
        this.#stmt.getEntriesByFlatSrc ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps FROM ${this.#tusTable}
            WHERE flattenNormalizedSourceToOrdinal(nsrc) = ? AND rank = 1;
        `);
        // try to delay creating the index until it is actually needed
        if (!this.#flatSrcIdxInitialized) {
            logVerbose`Creating FlatSrcIdx for table ${this.#tusTable}...`;
            this.#stmt.createFlatSrcIdx.run();
            this.#flatSrcIdxInitialized = true;
        }
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(nsrc);
        const tuRows = this.#stmt.getEntriesByFlatSrc.all(flattenedSrc);
        return tuRows.map(sqlTransformer.decode);
    }

    async deleteEmptyJobs(dryrun) {
        if (dryrun) {
            this.#stmt.countEmptyJobs ??= this.#db.prepare(/* sql */`
                SELECT COUNT(*)
                FROM jobs
                LEFT JOIN ${this.#tusTable} USING (jobGuid)
                WHERE sourceLang = ? AND targetLang = ? AND ${this.#tusTable}.guid IS NULL;
            `).pluck();
            return this.#stmt.countEmptyJobs.get(this.#sourceLang, this.#targetLang);
        } else {
            this.#stmt.deleteEmptyJobs ??= this.#db.prepare(/* sql */`
                DELETE FROM jobs
                WHERE jobGuid IN (
                    SELECT jobGuid
                    FROM jobs
                    LEFT JOIN ${this.#tusTable} USING (jobGuid)
                    WHERE sourceLang = ? AND targetLang = ? AND ${this.#tusTable}.guid IS NULL
                );
            `);
            return this.#stmt.deleteEmptyJobs.run(this.#sourceLang, this.#targetLang).changes;
        }
    }

    /**
     * Get TU keys (guid, jobGuid tuples) where rank exceeds the specified maximum.
     * @param {number} maxRank - Maximum rank threshold.
     * @returns {Promise<[string, string][]>} Array of [guid, jobGuid] tuples identifying TUs.
     */
    async tuKeysOverRank(maxRank) {
        this.#ensureIndexes();
        this.#stmt.tuKeysOverRank ??= this.#db.prepare(/* sql */`
            SELECT guid, jobGuid FROM ${this.#tusTable} WHERE rank > ?;`);
        return this.#stmt.tuKeysOverRank.all(maxRank).map(row => [row.guid, row.jobGuid]);
    }

    /**
     * Get TU keys (guid, jobGuid tuples) with a specific quality score.
     * @param {number} quality - Quality score to match.
     * @returns {Promise<[string, string][]>} Array of [guid, jobGuid] tuples identifying TUs.
     */
    async tuKeysByQuality(quality) {
        this.#ensureIndexes();
        this.#stmt.tuKeysByQuality ??= this.#db.prepare(/* sql */`
            SELECT guid, jobGuid FROM ${this.#tusTable} WHERE q = ?;`);
        return this.#stmt.tuKeysByQuality.all(quality).map(row => [row.guid, row.jobGuid]);
    }

    /**
     * Delete TUs identified by their composite keys (guid, jobGuid tuples).
     * @param {[string, string][]} tuKeys - Array of [guid, jobGuid] tuples identifying TUs to delete.
     * @returns {Promise<{deletedTusCount: number, touchedJobsCount: number}>} Count of deleted TUs and touched jobs.
     */
    async deleteTuKeys(tuKeys) {
        this.#stmt.deleteTuKey ??= this.#db.prepare(/* sql */`
            DELETE FROM ${this.#tusTable} WHERE guid = ? AND jobGuid = ?;`);
        this.#stmt.touchJobs ??= this.#db.prepare(/* sql */`
            UPDATE jobs SET updatedAt = ? WHERE jobGuid IN (SELECT value FROM JSON_EACH(?));
        `);
        return this.#db.transaction(() => {
            let deletedTusCount = 0;
            const touchedJobGuids = new Set();
            for (const [guid, jobGuid] of tuKeys) {
                const result = this.#stmt.deleteTuKey.run(guid, jobGuid);
                deletedTusCount += result.changes;
                if (result.changes > 0) {
                    touchedJobGuids.add(jobGuid);
                }
            }
            const touchedJobsCount = this.#stmt.touchJobs.run(new Date().toISOString(), JSON.stringify([...touchedJobGuids])).changes;
            return { deletedTusCount, touchedJobsCount };
        })();
    }

    async getStats() {
        this.#ensureIndexes();
        this.#stmt.getStats ??= this.#db.prepare(/* sql */`
            SELECT
                translationProvider,
                status,
                COUNT(*) AS tuCount,
                COUNT(DISTINCT guid) AS distinctGuids,
                COUNT(DISTINCT jobGuid) AS jobCount
            FROM ${this.#tusTable}
            JOIN jobs USING (jobGuid)
            WHERE
                sourceLang = @sourceLang AND targetLang = @targetLang
            GROUP BY 1, 2
            ORDER BY 3 DESC;
        `);
        return this.#stmt.getStats.all({
            sourceLang: this.#sourceLang,
            targetLang: this.#targetLang,
        });
    }

    /**
     * Get translated content status for a channel.
     * @param {import('../interfaces.js').ChannelDAL|string} channelDAL - ChannelDAL object or channelId string (TM worker mode)
     */
    async getTranslatedContentStatus(channelDAL) {
        this.#ensureIndexes();
        const { tableName: segmentsTable } = this.#getSegmentsTableInfo(channelDAL);
        // Use covering index rank_guid_q on TU table - all TU data comes from index
        // Segments table uses PRIMARY KEY (guid) for fast join lookup
        const tuIdxName = `idx_${this.#tusTable}_rank_guid_q`;
        const getTranslatedContentStatusStmt = this.#db.prepare(/* sql */`
            SELECT
                COALESCE(seg.prj, 'default') prj,
                seg.plan ->> @targetLang AS minQ,
                tu.q q,
                COUNT(DISTINCT seg.rid) res,
                COUNT(*) seg,
                SUM(seg.words) words,
                SUM(seg.chars) chars
            FROM
                ${this.#tusTable} tu INDEXED BY ${tuIdxName}
                INNER JOIN ${segmentsTable} seg
                    ON tu.guid = seg.guid
            WHERE tu.rank = 1
            AND seg.sourceLang = @sourceLang
            AND seg.plan ->> @targetLang IS NOT NULL
            GROUP BY 1, 2, 3
            ORDER BY 2 DESC, 3 DESC;
        `);
        return getTranslatedContentStatusStmt.all({ sourceLang: this.#sourceLang, targetLang: this.#targetLang });
    }

    /**
     * Get untranslated content status for a channel.
     * @param {import('../interfaces.js').ChannelDAL|string} channelDAL - ChannelDAL object or channelId string (TM worker mode)
     */
    async getUntranslatedContentStatus(channelDAL) {
        this.#ensureIndexes();
        const { tableName: segmentsTable } = this.#getSegmentsTableInfo(channelDAL);
        // Use guid_rank index on TU table for fast LEFT JOIN lookup
        const tuIdxName = `idx_${this.#tusTable}_guid_rank`;
        const getUntranslatedContentStatusStmt = this.#db.prepare(/* sql */`
            SELECT
                COALESCE(seg.prj, 'default') prj,
                seg."group" "group",
                seg.plan ->> @targetLang AS minQ,
                COUNT(*) seg,
                SUM(seg.words) words,
                SUM(seg.chars) chars
            FROM
                ${segmentsTable} seg
                LEFT JOIN ${this.#tusTable} tu INDEXED BY ${tuIdxName}
                    ON seg.guid = tu.guid AND tu.rank = 1
            WHERE seg.sourceLang = @sourceLang
            AND seg.plan ->> @targetLang IS NOT NULL
            AND (tu.q IS NULL OR (tu.q != 0 AND tu.q < (seg.plan ->> @targetLang)))
            GROUP BY 1, 2, 3
            ORDER BY 1, 2, 3 DESC;
        `);
        return getUntranslatedContentStatusStmt.all({ sourceLang: this.#sourceLang, targetLang: this.#targetLang });
    }

    /**
     * Get untranslated content from a channel.
     * @param {import('../interfaces.js').ChannelDAL|string} channelDAL - ChannelDAL object or channelId string (TM worker mode)
     * @param {Object} [options] - Options for the query.
     * @param {number} [options.limit=100] - Maximum number of segments to return.
     * @param {string[]} [options.prj] - Array of project names to filter by.
     * @returns {Promise<Object[]>} Array of untranslated translation units.
     */
    async getUntranslatedContent(channelDAL, { limit = 100, prj } = {}) {
        this.#ensureIndexes();
        const { tableName: segmentsTable, channelId } = this.#getSegmentsTableInfo(channelDAL);
        // Use json_extract instead of JSON_EACH to avoid expensive row expansion
        const getUntranslatedContentStmt = this.#db.prepare(/* sql */`
            SELECT
                '${channelId}' channel,
                COALESCE(prj, 'default') prj,
                seg.rid rid,
                seg.sid sid,
                seg.guid guid,
                seg.nstr nsrc,
                seg.notes notes,
                seg.mf mf,
                seg."group" "group",
                seg.segProps segProps,
                seg.plan ->> @targetLang AS minQ,
                seg.words words,
                seg.chars chars
            FROM
                ${segmentsTable} seg
                LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid AND tu.rank = 1
            WHERE
                sourceLang = @sourceLang
                AND seg.plan ->> @targetLang IS NOT NULL
                AND (tu.q IS NULL OR (tu.q != 0 AND tu.q < (seg.plan ->> @targetLang)))
                AND (@prj IS NULL OR COALESCE(prj, 'default') IN (SELECT value FROM JSON_EACH(@prj)))
            ORDER BY prj, rid, segOrder
            LIMIT @limit;
        `);
        const tus = getUntranslatedContentStmt.all({
            sourceLang: this.#sourceLang,
            targetLang: this.#targetLang,
            prj: prj?.length ? JSON.stringify(prj) : null,
            limit
        }).map(sqlTransformer.decode);
        return tus;
    }

    /**
     * Query source content with a custom WHERE condition.
     * @param {import('../interfaces.js').ChannelDAL|string} channelDAL - ChannelDAL object or channelId string (TM worker mode)
     * @param {string} whereCondition - SQL WHERE clause fragment
     */
    async querySource(channelDAL, whereCondition) {
        this.#ensureIndexes();
        const { tableName: segmentsTable, channelId } = this.#getSegmentsTableInfo(channelDAL);
        let stmt;
        try {
            // Use json_extract instead of JSON_EACH to avoid expensive row expansion
            stmt = this.#db.prepare(/* sql */`
                SELECT
                    '${channelId}' channel,
                    seg.prj prj,
                    seg.rid rid,
                    seg.sid sid,
                    seg.guid guid,
                    seg.nstr nsrc,
                    tu.ntgt ntgt,
                    tu.q q,
                    seg.plan ->> @targetLang AS minQ,
                    seg.notes notes,
                    seg.mf mf,
                    seg."group" "group",
                    seg.segProps segProps,
                    seg.words words,
                    seg.chars chars
                FROM ${segmentsTable} seg
                    LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid AND tu.rank = 1
                WHERE
                    sourceLang = @sourceLang
                    AND seg.plan ->> @targetLang IS NOT NULL
                    AND ${whereCondition.replaceAll(';', '')}
                ORDER BY prj, rid, segOrder
                LIMIT 10000;
            `);
        } catch (error) {
            throw new Error(`${error.code}: ${error.message}`);
        }
        const tus = stmt.all({ sourceLang: this.#sourceLang, targetLang: this.#targetLang }).map(sqlTransformer.decode);
        return tus;
    }

    /**
     * Query translation units by GUIDs.
     * @param {string[]} guids - Array of GUIDs to query
     * @param {import('../interfaces.js').ChannelDAL|string|null} channelDAL - ChannelDAL object, channelId string (TM worker mode), or null for orphaned TUs
     */
    async queryByGuids(guids, channelDAL) {
        this.#ensureIndexes();
        let stmt;
        if (channelDAL) {
            const { tableName: segmentsTable, channelId } = this.#getSegmentsTableInfo(channelDAL);
            // source can be tracked down, so use the latest
            // Use json_extract instead of JSON_EACH to avoid expensive row expansion
            stmt = this.#db.prepare(/* sql */`
                SELECT
                    '${channelId}' channel,
                    seg.prj prj,
                    seg.rid rid,
                    seg.sid sid,
                    seg.guid guid,
                    seg.nstr nsrc,
                    tu.ntgt ntgt,
                    tu.q q,
                    translationProvider,
                    ts,
                    seg.plan ->> @targetLang AS minQ,
                    seg.notes notes,
                    seg.mf mf,
                    seg."group" "group",
                    seg.segProps segProps,
                    seg.words words,
                    seg.chars chars
                FROM
                    ${segmentsTable} seg
                    JOIN JSON_EACH(@guids) wantedGuid ON seg.guid = wantedGuid.value
                    LEFT JOIN ${this.#tusTable} tu ON tu.guid = wantedGuid.value AND tu.rank = 1
                    LEFT JOIN jobs USING (jobGuid)
                WHERE
                    seg.sourceLang = @sourceLang
                    AND seg.plan ->> @targetLang IS NOT NULL
                ORDER BY prj, rid, segOrder;
            `);
        } else {
            // this is for basically retranslating orphaned TUs
            this.#stmt.getEntry ??= this.#db.prepare(/* sql */`
                SELECT
                    rid,
                    sid,
                    guid,
                    nsrc,
                    ntgt,
                    translationProvider,
                    ts,
                    q,
                    notes
                FROM
                    ${this.#tusTable} tu
                    JOIN JSON_EACH(@guids) wantedGuid ON tu.guid = wantedGuid.value
                    JOIN jobs USING (jobGuid)
                WHERE tu.rank = 1
                ORDER BY rid;
            `);
            stmt = this.#stmt.getEntry;
        }
        const tus = stmt.all({ guids: JSON.stringify(guids), sourceLang: this.#sourceLang, targetLang: this.#targetLang }).map(sqlTransformer.decode);
        return tus;
    }

    /**
     * @typedef {import('../interfaces.js').TuSearchParams} TuSearchParams
     */

    /**
     * Search translation units with filtering.
     * @param {number} offset - Number of records to skip for pagination.
     * @param {number} limit - Maximum number of records to return.
     * @param {TuSearchParams} options - Search filter options.
     * @returns {Promise<Object[]>} Array of matching translation units.
     */
    // eslint-disable-next-line complexity
    async search(offset, limit, { guid, nid, jobGuid, rid, sid, channel, nsrc, ntgt, notes, tconf, maxRank, onlyTNotes, q, minTS, maxTS, translationProvider, tmStore, group, includeTechnicalColumns, onlyLeveraged }) {
        this.#ensureIndexes();
        // Determine if we need channel/group for filtering vs just display
        // Note: onlyLeveraged uses EXISTS conditions (fast) instead of CTE join
        const needsChannelGroupFiltering = Array.isArray(channel) || Array.isArray(group);
        const needsChannelGroupDisplay = includeTechnicalColumns && !needsChannelGroupFiltering;
        // Generate EXISTS condition for onlyLeveraged filter (much faster than CTE INNER JOIN)
        const leveragedExistsCondition = onlyLeveraged ? this.#getLeveragedExistsCondition(`${this.#tusTable}.guid`, channel) : null;

        // Convert array params to JSON strings for SQLite JSON_EACH
        const searchParams = {
            sourceLang: this.#sourceLang,
            targetLang: this.#targetLang,
            offset,
            limit,
            guid,
            nid,
            jobGuid,
            rid,
            sid,
            nsrc,
            ntgt,
            notes,
            maxRank: maxRank ?? 10,
            onlyTNotes: onlyTNotes ? 1 : 0,
            tconf: Array.isArray(tconf) ? tconf.map(Number).filter(tconf => !isNaN(tconf)).join(',') : null,
            q: Array.isArray(q) ? q.map(Number).filter(q => !isNaN(q)).join(',') : null,
            minTS,
            maxTS,
        };
        if (Array.isArray(channel)) {
            channel.forEach((ch, idx) => {
                searchParams[`ch_${idx}`] = ch;
            });
        }
        if (Array.isArray(translationProvider)) {
            translationProvider.forEach((tp, idx) => {
                searchParams[`tp_${idx}`] = tp;
            });
        }
        // Handle tmStore filter (including __null__ for NULL values)
        if (Array.isArray(tmStore)) {
            const hasNullFilter = tmStore.includes('__null__');
            searchParams.includeNullTmStore = hasNullFilter ? 1 : 0;
            const nonNullTmStores = tmStore.filter(ts => ts !== '__null__');
            nonNullTmStores.forEach((ts, idx) => {
                searchParams[`ts_${idx}`] = ts;
            });
            searchParams.tmStoreCount = nonNullTmStores.length;
        }
        // Handle group filter (including 'Unknown' and 'Unassigned' as special values)
        if (Array.isArray(group)) {
            searchParams.filterGroupUnknown = group.includes('Unknown') ? 1 : 0;
            searchParams.filterGroupUnassigned = group.includes('Unassigned') ? 1 : 0;
            const regularGroups = group.filter(g => g !== 'Unknown' && g !== 'Unassigned');
            regularGroups.forEach((g, idx) => {
                searchParams[`grp_${idx}`] = g;
            });
            searchParams.groupCount = regularGroups.length;
        }
        const hasFilteredJobs = Array.isArray(translationProvider) || Array.isArray(tmStore);
        const filteredJobsCTE = hasFilteredJobs ?
            /* sql */`
            filtered_jobs AS (
                SELECT jobGuid, translationProvider, tmStore, updatedAt FROM jobs
                WHERE
                    sourceLang = @sourceLang AND targetLang = @targetLang
                    ${Array.isArray(translationProvider) ? `AND translationProvider IN (${translationProvider.map((_, idx) => `@tp_${idx}`).join(',')})` : ''}
                    ${Array.isArray(tmStore) ? `AND (${searchParams.tmStoreCount > 0 ? `tmStore IN (${tmStore.filter(ts => ts !== '__null__').map((_, idx) => `@ts_${idx}`).join(',')})` : '0'}${searchParams.includeNullTmStore ? `${searchParams.tmStoreCount > 0 ? ' OR ' : ''}tmStore IS NULL` : ''})` : ''}
            )` :
            '';

        // Build CTE section - only include active_guids CTE when filtering by channel/group
        const cteParts = [];
        if (filteredJobsCTE) {
            cteParts.push(filteredJobsCTE);
        }
        if (needsChannelGroupFiltering) {
            cteParts.push(this.#getActiveGuidsCTE(channel));
        }
        const withClause = cteParts.length > 0 ? `WITH ${cteParts.join(', ')}` : '';

        const searchSql = /* sql */`
            ${withClause}
            SELECT
                guid,
                jobGuid,
                ${needsChannelGroupFiltering ? 'channel,' : ''}
                rid,
                sid,
                ${needsChannelGroupFiltering ?
                    `CASE
                    WHEN channel IS NULL THEN 'Unknown'
                    WHEN active_guids."group" IS NULL THEN 'Unassigned'
                    ELSE active_guids."group"
                END AS "group",` :
                    ''}
                nsrc,
                ntgt,
                notes,
                tuProps->>'$.nid' nid,
                tuProps->>'$.tconf' tconf,
                tuProps->>'$.tnotes' tnotes,
                q,
                ts,
                translationProvider,
                tmStore,
                rank = 1 active,
                updatedAt
            FROM ${this.#tusTable}
            JOIN ${Array.isArray(translationProvider) || Array.isArray(tmStore) ? 'filtered_jobs' : 'jobs'} USING (jobGuid)
            ${needsChannelGroupFiltering ? `${Array.isArray(channel) ? 'INNER' : 'LEFT'} JOIN active_guids USING (guid)` : ''}
            WHERE
                rank <= @maxRank
                ${leveragedExistsCondition ? `AND ${leveragedExistsCondition}` : ''}
                ${searchParams.guid ? 'AND guid LIKE @guid' : ''}
                ${searchParams.nid ? 'AND nid LIKE @nid' : ''}
                ${searchParams.jobGuid ? 'AND jobGuid LIKE @jobGuid' : ''}
                ${searchParams.rid ? 'AND rid LIKE @rid' : ''}
                ${searchParams.sid ? 'AND sid LIKE @sid' : ''}
                ${searchParams.nsrc ? 'AND flattenNormalizedSourceToOrdinal(nsrc) LIKE @nsrc' : ''}
                ${searchParams.ntgt ? 'AND flattenNormalizedSourceToOrdinal(ntgt) LIKE @ntgt' : ''}
                ${searchParams.notes ? 'AND notes LIKE @notes' : ''}
                ${searchParams.tconf !== null ? `AND tuProps->>'$.tconf' IN (${searchParams.tconf})` : ''}
                ${searchParams.onlyTNotes ? 'AND (NOT @onlyTNotes OR tnotes IS NOT NULL)' : ''}
                ${searchParams.q !== null ? `AND q IN (${searchParams.q})` : ''}
                ${searchParams.minTS ? 'AND ts >= @minTS' : ''}
                ${searchParams.maxTS ? 'AND ts <= @maxTS' : ''}
                ${Array.isArray(group) && (searchParams.filterGroupUnknown || searchParams.filterGroupUnassigned || searchParams.groupCount > 0) ?
                    `AND (
                    ${searchParams.filterGroupUnknown ? 'channel IS NULL' : ''}
                    ${searchParams.filterGroupUnassigned ? `${searchParams.filterGroupUnknown ? ' OR ' : ''}(channel IS NOT NULL AND active_guids."group" IS NULL)` : ''}
                    ${searchParams.groupCount > 0 ? `${searchParams.filterGroupUnknown || searchParams.filterGroupUnassigned ? ' OR ' : ''}active_guids."group" IN (${group.filter(g => g !== 'Unknown' && g !== 'Unassigned').map((_, idx) => `@grp_${idx}`).join(',')})` : ''}
                )` :
                    ''}
            ORDER BY ts DESC, rid, tuOrder
            LIMIT @limit
            OFFSET @offset;
        `;
        try {
            // logVerbose`Running ${searchSql} with params: ${JSON.stringify(searchParams)}`;
            const results = this.#db.prepare(searchSql).all(searchParams);
            const decodedResults = results.map(sqlTransformer.decode);

            // If we need channel/group for display only (not filtering), look them up separately
            // This is much faster than joining with a massive UNION ALL CTE
            if (needsChannelGroupDisplay && decodedResults.length > 0) {
                const guids = decodedResults.map(r => r.guid);
                const channelGroupMap = this.#lookupChannelAndGroup(guids, null);

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
        } catch (error) {
            throw new Error(`TM search failed: ${error.message}`);
        }
    }

    async lookup({ guid, nid, rid, sid }) {
        this.#ensureIndexes();
        this.#stmt.lookup ??= this.#db.prepare(/* sql */`
            SELECT
                rid,
                sid,
                guid,
                nsrc,
                ntgt,
                q,
                notes
            FROM ${this.#tusTable}
            WHERE
                (guid = @guid OR @guid IS NULL)
                AND (tuProps->>'$.nid' = @nid OR @nid IS NULL)
                AND (rid = @rid OR @rid IS NULL)
                AND (sid = @sid OR @sid IS NULL)
                AND rank = 1
            ORDER BY q DESC, ts DESC
            LIMIT 10;
        `);
        try {
            const tus = this.#stmt.lookup.all({ guid, nid, rid, sid }).map(sqlTransformer.decode);
            return tus;
        } catch (error) {
            throw new Error(`${error.code}: ${error.message}`);
        }
    }

    /**
     * Get distinct values for low cardinality columns (for filtering UI).
     * @returns {Promise<Record<string, string[]>>}
     */
    async getLowCardinalityColumns() {
        this.#ensureIndexes();
        this.#stmt.getQValues ??= this.#db.prepare(/* sql */`
            WITH RECURSIVE distinct_q(q) AS (
                SELECT min(q) FROM ${this.#tusTable}
                UNION ALL
                SELECT (SELECT min(q) FROM ${this.#tusTable} WHERE q > distinct_q.q)
                FROM distinct_q
                WHERE q IS NOT NULL
            )
            SELECT q FROM distinct_q WHERE q IS NOT NULL;
        `).pluck();
        this.#stmt.getTconfValues ??= this.#db.prepare(/* sql */`
            WITH RECURSIVE distinct_tconf(tconf) AS (
                -- 1. Get the very first (lowest) value
                SELECT min(tuProps->>'$.tconf') 
                FROM ${this.#tusTable}
                
                UNION ALL
                
                -- 2. Find the next value greater than the current one
                SELECT (
                    SELECT min(tuProps->>'$.tconf') 
                    FROM ${this.#tusTable} 
                    WHERE (tuProps->>'$.tconf') > distinct_tconf.tconf
                )
                FROM distinct_tconf
                WHERE tconf IS NOT NULL
            )
            SELECT tconf FROM distinct_tconf WHERE tconf IS NOT NULL;
        `).pluck();
        this.#stmt.getTranslationProviderValues ??= this.#db.prepare(/* sql */`
            SELECT DISTINCT translationProvider
            FROM jobs
            WHERE
                translationProvider IS NOT NULL AND
                sourceLang = ? AND
                targetLang = ?;
        `).pluck();
        this.#stmt.getTmStoreValues ??= this.#db.prepare(/* sql */`
            SELECT DISTINCT COALESCE(tmStore, '__null__') tmStore
            FROM jobs
            WHERE
                sourceLang = ? AND
                targetLang = ?;
        `).pluck();

        /** @type {Record<string, string[]>} */
        const enumValues = {};
        const qValues = this.#stmt.getQValues.all();
        const tconfValues = this.#stmt.getTconfValues.all();
        const translationProviderValues = this.#stmt.getTranslationProviderValues.all(this.#sourceLang, this.#targetLang);
        const tmStoreValues = this.#stmt.getTmStoreValues.all(this.#sourceLang, this.#targetLang);
        qValues.length > 0 && (enumValues.q = qValues);
        tconfValues.length > 0 && (enumValues.tconf = tconfValues);
        translationProviderValues.length > 0 && (enumValues.translationProvider = translationProviderValues);
        tmStoreValues.length > 0 && (enumValues.tmStore = tmStoreValues);

        // Get distinct group values from active segment tables
        // This requires dynamic query since segment tables vary by active channels
        const groupValues = new Set(['Unknown', 'Unassigned']); // Always include these special values
        for (const channelId of this.#DAL.activeChannels) {
            const channelDAL = this.#DAL.channel(channelId);
            try {
                const stmt = this.#db.prepare(/* sql */`
                    WITH RECURSIVE distinct_groups("group") AS (
                        -- 1. Get the first alphabetical group
                        SELECT min("group") 
                        FROM ${channelDAL.segmentsTable}
                        
                        UNION ALL
                        
                        -- 2. Hop to the next group alphabetically
                        SELECT (
                            SELECT min("group")
                            FROM ${channelDAL.segmentsTable}
                            WHERE "group" > distinct_groups."group"
                        )
                        FROM distinct_groups
                        WHERE "group" IS NOT NULL
                    )
                    SELECT "group" FROM distinct_groups WHERE "group" IS NOT NULL;
                `).pluck();
                const channelGroups = stmt.all();
                channelGroups.forEach(g => groupValues.add(g));
            } catch {
                // If segment table doesn't exist or has no group column, skip silently
            }
        }
        if (groupValues.size > 0) {
            enumValues.group = Array.from(groupValues);
        }

        return enumValues;
    }

    async getQualityDistribution() {
        this.#ensureIndexes();
        this.#stmt.getQualityDistribution ??= this.#db.prepare(/* sql */`
            SELECT
                q,
                COUNT(*) count
            FROM ${this.#tusTable}
            GROUP BY q
            ORDER BY q;
        `);
        return this.#stmt.getQualityDistribution.all();
    }

    // ========== Job Query Methods (scoped to this language pair) ==========

    /**
     * Get job table of contents for this language pair.
     * @returns {Promise<Array<{jobGuid: string, status: string, translationProvider: string, updatedAt: string}>>}
     */
    async getJobTOC() {
        this.#stmt.getJobTOC ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, status, translationProvider, updatedAt
            FROM jobs
            WHERE sourceLang = ? AND targetLang = ?
            ORDER BY updatedAt DESC;
        `);
        return this.#stmt.getJobTOC.all(this.#sourceLang, this.#targetLang);
    }

    /**
     * Get a job by its GUID (scoped to this language pair).
     * @param {string} jobGuid - Job identifier.
     * @returns {Promise<Object|undefined>} Job with parsed props, or undefined.
     */
    async getJob(jobGuid) {
        this.#stmt.getJob ??= this.#db.prepare(/* sql */`
            SELECT
                jobGuid,
                jobProps,
                sourceLang,
                targetLang,
                translationProvider,
                status,
                updatedAt
            FROM jobs WHERE jobGuid = ? AND sourceLang = ? AND targetLang = ?;
        `);
        const jobRow = this.#stmt.getJob.get(jobGuid, this.#sourceLang, this.#targetLang);
        if (jobRow) {
            const { jobProps, ...basicProps } = jobRow;
            return { ...basicProps, ...JSON.parse(jobProps) };
        }
    }

    /**
     * Get job count for this language pair.
     * @returns {Promise<number>}
     */
    async getJobCount() {
        this.#stmt.getJobCount ??= this.#db.prepare(/* sql */`
            SELECT count(*) FROM jobs WHERE sourceLang = ? AND targetLang = ?;
        `).pluck();
        return this.#stmt.getJobCount.get(this.#sourceLang, this.#targetLang);
    }

    /**
     * Get job statistics for this language pair.
     * @returns {Promise<Array<{sourceLang: string, targetLang: string, tmStore: string, jobCount: number, lastUpdatedAt: string}>>}
     */
    async getJobStats() {
        this.#stmt.getJobStats ??= this.#db.prepare(/* sql */`
            SELECT
                sourceLang,
                targetLang,
                tmStore,
                COUNT(*) jobCount,
                MAX(updatedAt) lastUpdatedAt
            FROM jobs
            WHERE sourceLang = ? AND targetLang = ?
            GROUP BY 1, 2, 3
            ORDER BY 5 DESC;
        `);
        return this.#stmt.getJobStats.all(this.#sourceLang, this.#targetLang);
    }

    /**
     * Set the TM store for a job.
     * @param {string} jobGuid - Job identifier.
     * @param {string} tmStoreId - TM store identifier.
     */
    async setJobTmStore(jobGuid, tmStoreId) {
        this.#stmt.setJobTmStore ??= this.#db.prepare(/* sql */`
            UPDATE jobs SET tmStore = ? WHERE jobGuid = ? AND sourceLang = ? AND targetLang = ?;
        `);
        return this.#stmt.setJobTmStore.run(tmStoreId, jobGuid, this.#sourceLang, this.#targetLang);
    }

    /**
     * Get job deltas between local DB and remote TOC.
     * @param {Object} toc - Remote table of contents.
     * @param {string} storeId - TM store identifier.
     * @returns {Promise<Array>} Array of delta objects.
     */
    async getJobDeltas(toc, storeId) {
        this.#stmt.getJobDeltas ??= this.#db.prepare(/* sql */`
            SELECT
                tmStore,
                blockId,
                j.jobGuid localJobGuid,
                lt.jobGuid remoteJobGuid,
                j.updatedAt localUpdatedAt,
                lt.updatedAt remoteUpdatedAt
            FROM (
                SELECT tmStore, jobGuid, updatedAt
                FROM jobs
                WHERE sourceLang = ? AND targetLang = ?
            ) j
            FULL JOIN last_toc lt USING (jobGuid)
            WHERE j.updatedAt != lt.updatedAt
               OR j.updatedAt IS NULL
               OR lt.updatedAt IS NULL
               OR (j.tmStore IS NOT NULL AND j.tmStore != ?)
        `);
        this.#lastTOC = toc;
        return this.#stmt.getJobDeltas.all(this.#sourceLang, this.#targetLang, storeId);
    }

    /**
     * Get valid job IDs for a block.
     * @param {Object} toc - Remote table of contents.
     * @param {string} blockId - Block identifier.
     * @param {string} storeId - TM store identifier.
     * @returns {Promise<string[]>} Array of job GUIDs.
     */
    async getValidJobIds(toc, blockId, storeId) {
        this.#stmt.getValidJobIds ??= this.#db.prepare(/* sql */`
            SELECT jobs.jobGuid
            FROM jobs JOIN last_toc USING (jobGuid)
            WHERE sourceLang = ? AND targetLang = ? AND blockId = ?
              AND jobs.tmStore = ?;
        `).pluck();
        this.#lastTOC = toc;
        return this.#stmt.getValidJobIds.all(this.#sourceLang, this.#targetLang, blockId, storeId);
    }
}
