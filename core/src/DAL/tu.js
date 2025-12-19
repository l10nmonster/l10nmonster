import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { createSQLObjectTransformer } from './index.js';

const sqlTransformer = createSQLObjectTransformer(['nstr', 'nsrc', 'ntgt', 'notes', 'qa', 'tuProps', 'segProps'], ['tuProps', 'segProps']);

export class TuDAL {
    #db;
    #sourceLang;
    #targetLang;
    #DAL;
    #tusTable;
    #stmt = {}; // prepared statements
    #flatSrcIdxInitialized = false; // used to add the index as late as possible

    constructor(db, sourceLang, targetLang, DAL) {
        this.#db = db;
        this.#sourceLang = sourceLang;
        this.#targetLang = targetLang;
        this.#DAL = DAL;
        this.#tusTable = `tus_${sourceLang}_${targetLang}`.replace(/[^a-zA-Z0-9_]/g, '_');
        db.exec(/* sql */`
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
                rank INTEGER,
                PRIMARY KEY (guid, jobGuid)
            );
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_jobGuid_guid ON ${this.#tusTable} (jobGuid, guid);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_ts ON ${this.#tusTable} (ts DESC);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_q_ts ON ${this.#tusTable} (q, ts DESC);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_tconf_ts ON ${this.#tusTable} (tuProps->>'$.tconf', ts DESC);
        `);
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

    #getActiveGuidsCTE(channelList) {
        const segmentTables = [];
        for (const channelId of this.#DAL.activeChannels) {
            if (channelList && !channelList.includes(channelId)) continue;
            const channelDAL = this.#DAL.channel(channelId);
            segmentTables.push([channelDAL.segmentsTable, channelId]);
        }
        // Handle the case when there are no active channels - provide an empty CTE
        const unionQuery = segmentTables.length > 0
            ? segmentTables.map(([table, channelId]) => `SELECT guid, '${channelId}' AS channel, "group" FROM ${table}`).join(' UNION ALL ')
            : `SELECT NULL AS guid, NULL AS channel, NULL AS "group" WHERE 0`; // Empty result set
        return /* sql */`
            active_guids AS (
                ${unionQuery}
            )
        `;
    }

    #getEntry(guid) {
        this.#stmt.getEntry ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps
            FROM ${this.#tusTable}
            WHERE guid = ? AND rank = 1
            LIMIT 1;
        `);
        const tuRow = this.#stmt.getEntry.get(guid);
        return tuRow ? sqlTransformer.decode(tuRow) : undefined;
    }

    async getEntries(guids) {
        const uniqueGuids = new Set(guids);
        const entries = {};
        for (const guid of uniqueGuids) {
            const entry = this.#getEntry(guid);
            entry && (entries[guid] = entry);
        }
        return entries;
    }

    async getEntriesByJobGuid(jobGuid) {
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

    #setEntry(tu) {
        this.#stmt.setEntry ??= this.#db.prepare(/* sql */`
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
        // select properties are extracted so that they can be queried
        const { jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuOrder, ...tuProps } = tu;
        const result = this.#stmt.setEntry.run(sqlTransformer.encode({
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

    /**
     * Sets or updates a job in the database.
     * @param {Object} job - The job object to set or update.
     * @param {string} job.sourceLang - The source language of the job.
     * @param {string} job.targetLang - The target language of the job.
     * @param {string} job.jobGuid - The unique identifier for the job.
     * @param {string} job.status - The status of the job.
     * @param {string} job.updatedAt - The timestamp when the job was last updated.
     * @param {string} job.translationProvider - The translation provider associated with the job.
     */
    #upsertJobRow(completeJobProps, tmStoreId) {
        this.#stmt.upsertJobRow ??= this.#db.prepare(/* sql */`
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
        const result = this.#stmt.upsertJobRow.run({ jobGuid, sourceLang, targetLang, status, updatedAt: updatedAt ?? new Date().toISOString(), translationProvider, jobProps: JSON.stringify(jobProps), tmStoreId });
        if (result.changes !== 1) {
            throw new Error(`Expecting to change a row but changed ${result}`);
        }
    }
    
    async saveJob(jobProps, tus, tmStoreId) {
        this.#db.transaction(() => {
            this.#upsertJobRow(jobProps, tmStoreId);
            this.#updateRank(jobProps.jobGuid, false); // we need to update the rank in case some extries will be deleted
            this.#deleteEntriesByJobGuid(jobProps.jobGuid);
            tus.forEach((tu, tuOrder) => this.#setEntry({
                ...tu,
                jobGuid: jobProps.jobGuid,
                tuOrder,
            }));
            this.#updateRank(jobProps.jobGuid, true);
        })();
    }

    async deleteJob(jobGuid) {
        this.#stmt.deleteJob ??= this.#db.prepare(/* sql */`
            DELETE FROM jobs WHERE jobGuid = ?;
        `);
        this.#db.transaction(() => {
            this.#updateRank(jobGuid, false); // we need to update the rank for the job before deleting the entries
            this.#deleteEntriesByJobGuid(jobGuid);
            this.#stmt.deleteJob.run(jobGuid);
        })();
    }

    async getExactMatches(nsrc) {
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

    async getActiveContentTranslationStatus(channelDAL) {
        const getActiveContentTranslationStatusStmt = this.#db.prepare(/* sql */`
            SELECT
                COALESCE(seg.prj, 'default') prj,
                p.value minQ,
                tu.q q,
                COUNT(DISTINCT seg.rid) res,
                COUNT(DISTINCT seg.guid) seg,
                SUM(words) words,
                SUM(chars) chars
            FROM
                ${channelDAL.segmentsTable} seg,
                JSON_EACH(seg.plan) p
                LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid
            WHERE sourceLang = ? AND p.key = ?
            AND (tu.rank = 1 OR tu.rank IS NULL)
            GROUP BY 1, 2, 3
            ORDER BY 2 DESC, 3 DESC;
        `);
        return getActiveContentTranslationStatusStmt.all(this.#sourceLang, this.#targetLang);
    }

    /**
     * Get untranslated content from a channel.
     * @param {Object} channelDAL - The channel DAL instance.
     * @param {Object} [options] - Options for the query.
     * @param {number} [options.limit=100] - Maximum number of segments to return.
     * @param {string[]} [options.prj] - Array of project names to filter by.
     * @returns {Promise<Object[]>} Array of untranslated translation units.
     */
    async getUntranslatedContent(channelDAL, { limit = 100, prj } = {}) {
        const getUntranslatedContentStmt = this.#db.prepare(/* sql */`
            SELECT
                '${channelDAL.channelId}' channel,
                COALESCE(prj, 'default') prj,
                seg.rid rid,
                seg.sid sid,
                seg.guid guid,
                seg.nstr nsrc,
                seg.notes notes,
                seg.mf mf,
                seg."group" "group",
                seg.segProps segProps,
                p.value minQ,
                seg.words words,
                seg.chars chars
            FROM
                ${channelDAL.segmentsTable} seg,
                JSON_EACH(seg.plan) p
                LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid
            WHERE
                sourceLang = @sourceLang AND p.key = @targetLang
                AND (tu.rank = 1 OR tu.rank IS NULL)
                AND (tu.q IS NULL OR (tu.q != 0 AND tu.q < p.value))
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

    async querySource(channelDAL, whereCondition) {
        let stmt;
        try {
            stmt = this.#db.prepare(/* sql */`
                SELECT
                    '${channelDAL.channelId}' channel,
                    seg.prj prj,
                    seg.rid rid,
                    seg.sid sid,
                    seg.guid guid,
                    seg.nstr nsrc,
                    tu.ntgt ntgt,
                    tu.q q,
                    p.value minQ,
                    seg.notes notes,
                    seg.mf mf,
                    seg."group" "group",
                    seg.segProps segProps,
                    seg.words words,
                    seg.chars chars
                FROM ${channelDAL.segmentsTable} seg,
                    JSON_EACH(seg.plan) p
                    LEFT JOIN ${this.#tusTable} tu ON seg.guid = tu.guid
                WHERE
                    sourceLang = ? AND p.key = ?
                    AND (tu.rank = 1 OR tu.rank IS NULL)
                    AND ${whereCondition.replaceAll(';', '')}
                ORDER BY prj, rid, segOrder
                LIMIT 10000;
            `);
        } catch (error) {
            throw new Error(`${error.code}: ${error.message}`);
        }
        const tus = stmt.all(this.#sourceLang, this.#targetLang).map(sqlTransformer.decode);
        return tus;
    }

    async queryByGuids(guids, channelDAL) {
        let stmt;
        if (channelDAL) {
            // source can be tracked down, so use the latest
            stmt = this.#db.prepare(/* sql */`
                SELECT
                    '${channelDAL.channelId}' channel,
                    seg.prj prj,
                    seg.rid rid,
                    seg.sid sid,
                    seg.guid guid,
                    seg.nstr nsrc,
                    tu.ntgt ntgt,
                    tu.q q,
                    translationProvider,
                    ts,
                    p.value minQ,
                    seg.notes notes,
                    seg.mf mf,
                    seg."group" "group",
                    seg.segProps segProps,
                    seg.words words,
                    seg.chars chars
                FROM
                    ${channelDAL.segmentsTable} seg
                    JOIN JSON_EACH(@guids) wantedGuid ON seg.guid = wantedGuid.value,
                    JSON_EACH(seg.plan) p
                    LEFT JOIN ${this.#tusTable} tu ON tu.guid = wantedGuid.value
                    JOIN jobs USING (jobGuid)
                WHERE
                    seg.sourceLang = @sourceLang AND p.key = @targetLang
                    AND (tu.rank = 1 OR tu.rank IS NULL)
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
     * Search translation units with filtering.
     * @param {number} offset - Number of records to skip for pagination.
     * @param {number} limit - Maximum number of records to return.
     * @param {Object} options - Search filter options.
     * @param {string} [options.guid] - Filter by GUID (supports SQL LIKE patterns).
     * @param {string} [options.nid] - Filter by NID (supports SQL LIKE patterns).
     * @param {string} [options.jobGuid] - Filter by job GUID (supports SQL LIKE patterns).
     * @param {string} [options.rid] - Filter by resource ID (supports SQL LIKE patterns).
     * @param {string} [options.sid] - Filter by segment ID (supports SQL LIKE patterns).
     * @param {string[]} [options.channel] - Filter by channel(s) - array for multi-select (exact match).
     * @param {string} [options.nsrc] - Filter by source text (supports SQL LIKE patterns).
     * @param {string} [options.ntgt] - Filter by target text (supports SQL LIKE patterns).
     * @param {string} [options.notes] - Filter by notes (supports SQL LIKE patterns).
     * @param {string[]} [options.tconf] - Filter by translation confidence(s) - array of string representations of integers.
     *                                     SQL casts JSON values to INTEGER for comparison with DB integers.
     * @param {number} [options.maxRank=10] - Maximum rank to include (1 = only active/best translations).
     * @param {boolean} [options.onlyTNotes] - If true, only return TUs with translator notes.
     * @param {string[]} [options.q] - Filter by quality score(s) - array of string representations of integers.
     *                                  SQL casts JSON values to INTEGER for comparison with DB integers.
     * @param {number} [options.minTS] - Minimum timestamp (milliseconds since epoch).
     * @param {number} [options.maxTS] - Maximum timestamp (milliseconds since epoch).
     * @param {string[]} [options.translationProvider] - Filter by provider(s) - array for multi-select (exact match).
     * @param {string[]} [options.tmStore] - Filter by TM store(s) - array for multi-select. Use '__null__' to filter for NULL values.
     * @param {string[]} [options.group] - Filter by group(s) - array for multi-select (exact match). Includes 'Unknown' and 'Unassigned' as special values.
     * @param {boolean} [options.includeTechnicalColumns] - If true, includes channel and group columns (requires CTE join).
     * @returns {Promise<Object[]>} Array of matching translation units.
     */
    async search(offset, limit, { guid, nid, jobGuid, rid, sid, channel, nsrc, ntgt, notes, tconf, maxRank,onlyTNotes, q, minTS, maxTS, translationProvider, tmStore, group, includeTechnicalColumns }) {
        // Determine if we need the CTE (for channel/group display or filtering)
        const needsCTE = includeTechnicalColumns || Array.isArray(channel) || Array.isArray(group);

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
        // Build CTE section only when needed
        const cteParts = [];
        if (filteredJobsCTE) {
            cteParts.push(filteredJobsCTE);
        }
        if (needsCTE) {
            cteParts.push(this.#getActiveGuidsCTE(channel));
        }
        const withClause = cteParts.length > 0 ? `WITH ${cteParts.join(', ')}` : '';

        const searchSql = /* sql */`
            ${withClause}
            SELECT
                guid,
                jobGuid,
                ${needsCTE ? 'channel,' : ''}
                rid,
                sid,
                ${needsCTE ?
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
            ${needsCTE ? `${Array.isArray(channel) ? 'INNER' : 'LEFT'} JOIN active_guids USING (guid)` : ''}
            WHERE
                rank <= @maxRank
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
            logVerbose`Running ${searchSql} with params: ${JSON.stringify(searchParams)}`;
            const results = this.#db.prepare(searchSql).all(searchParams);
            return results.map(sqlTransformer.decode);
        } catch (error) {
            throw new Error(`TM search failed: ${error.message}`);
        }
    }

    async lookup({ guid, nid, rid, sid }) {
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

    async getLowCardinalityColumns() {
        this.#stmt.getQValues ??= this.#db.prepare(/* sql */`
            SELECT DISTINCT q
            FROM ${this.#tusTable}
            WHERE q IS NOT NULL;
        `).pluck();
        this.#stmt.getTconfValues ??= this.#db.prepare(/* sql */`
            SELECT DISTINCT tuProps->>'$.tconf' tconf
            FROM ${this.#tusTable}
            WHERE tuProps->>'$.tconf' IS NOT NULL;
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
                    SELECT DISTINCT "group"
                    FROM ${channelDAL.segmentsTable}
                    WHERE "group" IS NOT NULL;
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
}
