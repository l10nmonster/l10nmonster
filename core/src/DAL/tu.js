import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { createSQLObjectTransformer } from './index.js';

const sqlTransformer = createSQLObjectTransformer(['nstr', 'nsrc', 'ntgt', 'notes', 'tuProps', 'segProps'], ['tuProps', 'segProps']);

export class TuDAL {
    #db;
    #sourceLang;
    #targetLang;
    #DAL;
    #tusTable;
    #stmt = {}; // prepared statements
    #flatSrcIdxInitialized = false; // used to add the index as late as possible
    #lazyActiveGuidsCTE;

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
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_jobGuid ON ${this.#tusTable} (jobGuid);
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_ts ON ${this.#tusTable} (ts);
        `);
        db.function(
            'flattenNormalizedSourceToOrdinal',
            { deterministic: true },
            nsrc => utils.flattenNormalizedSourceToOrdinal(JSON.parse(nsrc))
        );
    }

    get #activeGuidsCTE() {
        if (!this.#lazyActiveGuidsCTE) {
            const segmentTables = [];
            for (const channelId of this.#DAL.activeChannels) {
                const channelDAL = this.#DAL.channel(channelId);
                segmentTables.push([channelDAL.segmentsTable, channelId]);
            }
            this.#lazyActiveGuidsCTE = /* sql */`
                active_guids AS (
                    ${segmentTables.map(([table, channelId]) => `SELECT guid, '${channelId}' AS channel FROM ${table}`).join(' UNION ALL ')}
                )
            `;
        }
        return this.#lazyActiveGuidsCTE;
    }

    #getEntry(guid) {
        this.#stmt.getEntry ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps
            FROM ${this.#tusTable}
            WHERE guid = ?
            ORDER BY q DESC, ts DESC
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
            SET rank = (
                SELECT ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC)
                FROM ${this.#tusTable} t2
                WHERE
                    t2.guid = ${this.#tusTable}.guid
                    AND (t2.jobGuid != @jobGuid OR @includeJob = 1)
            )
            WHERE jobGuid = @jobGuid;
        `);
        return this.#stmt.updateRank.run({jobGuid, includeJob: includeJob ? 1 : 0});
    }

    async saveJob(jobProps, tus) {
        this.#db.transaction(() => {
            this.#DAL.job.setJob(jobProps);
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
        this.#db.transaction(() => {
            this.#updateRank(jobGuid, false); // we need to update the rank for the job before deleting the entries
            this.#deleteEntriesByJobGuid(jobGuid);
            this.#DAL.job.deleteJob(jobGuid);
        })();
    }

    async getExactMatches(nsrc) {
        this.#stmt.createFlatSrcIdx ??= this.#db.prepare(/* sql */`
            CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_flatSrc
            ON ${this.#tusTable} (flattenNormalizedSourceToOrdinal(nsrc));
        `);
        this.#stmt.getEntriesByFlatSrc ??= this.#db.prepare(/* sql */`
            SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps FROM ${this.#tusTable}
            WHERE flattenNormalizedSourceToOrdinal(nsrc) = ?;
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

    async getStats() {
        this.#stmt.getStats ??= this.#db.prepare(/* sql */`
            SELECT
                translationProvider,
                status,
                COUNT(*) AS tuCount,
                COUNT (DISTINCT guid) AS distinctGuids,
                COUNT (DISTINCT jobGuid) AS jobCount
            FROM ${this.#tusTable}
            JOIN jobs USING (jobGuid)
            GROUP BY 1, 2
            ORDER BY 3 DESC
            ;`);
        return this.#stmt.getStats.all();
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

    async getUntranslatedContent(channelDAL, limit = 100) {
        this.#stmt.getUntranslatedContent ??= this.#db.prepare(/* sql */`
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
                sourceLang = ? AND p.key = ? 
                AND (tu.rank = 1 OR tu.rank IS NULL)
                AND (tu.q IS NULL OR (tu.q != 0 AND tu.q < p.value))
            ORDER BY prj, rid, segOrder
            LIMIT ?;
        `);
        const tus = this.#stmt.getUntranslatedContent.all(this.#sourceLang, this.#targetLang, limit).map(sqlTransformer.decode);
        tus.forEach(tu => tu.gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc));
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
        tus.forEach(tu => tu.gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc));
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
                    q,
                    notes
                FROM
                    ${this.#tusTable} tu
                    JOIN JSON_EACH(@guids) wantedGuid ON tu.guid = wantedGuid.value
                WHERE tu.rank = 1
                ORDER BY rid;
            `);
            stmt = this.#stmt.getEntry;
        }
        const tus = stmt.all({ guids: JSON.stringify(guids), sourceLang: this.#sourceLang, targetLang: this.#targetLang }).map(sqlTransformer.decode);
        tus.forEach(tu => tu.gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc));
        return tus;
    }

    async search(offset, limit, { guid, nid, jobGuid, rid, sid, channel, nsrc, ntgt, notes, tconf, onlyTNotes, q, minTS, maxTS, translationProvider }) {
        const activeGuidsCTE = this.#activeGuidsCTE; // we need to ensure all tables are created before we can join them
        this.#stmt.search ??= this.#db.prepare(/* sql */`
            WITH ${activeGuidsCTE}
            SELECT
                guid,
                jobGuid,
                channel,
                rid,
                sid,
                nsrc,
                ntgt,
                notes,
                tuProps->>'$.nid' nid,
                tuProps->>'$.tconf' tconf,
                tuProps->>'$.tnotes' tnotes,
                q,
                ts,
                translationProvider,
                rank = 1 active,
                updatedAt
            FROM ${this.#tusTable}
            JOIN jobs USING (jobGuid)
            LEFT JOIN active_guids USING (guid)
            WHERE
                (guid LIKE @guid OR @guid IS NULL)
                AND (nid LIKE @nid OR @nid IS NULL)
                AND (jobGuid LIKE @jobGuid OR @jobGuid IS NULL)
                AND (rid LIKE @rid OR @rid IS NULL)
                AND (sid LIKE @sid OR @sid IS NULL)
                AND (channel LIKE @channel OR @channel IS NULL)
                AND (flattenNormalizedSourceToOrdinal(nsrc) LIKE @nsrc OR @nsrc IS NULL)
                AND (flattenNormalizedSourceToOrdinal(ntgt) LIKE @ntgt OR @ntgt IS NULL)
                AND (notes LIKE @notes OR @notes IS NULL)
                AND (tconf LIKE @tconf OR @tconf IS NULL)
                AND (NOT @onlyTNotes OR tnotes IS NOT NULL)
                AND (q = @q OR @q IS NULL)
                AND (ts >= @minTS OR @minTS IS NULL)
                AND (ts <= @maxTS OR @maxTS IS NULL)
                AND (translationProvider LIKE @translationProvider OR @translationProvider IS NULL)
            ORDER BY ts DESC, rid, tuOrder
            LIMIT @limit
            OFFSET @offset;
        `);
        try {
            const tus = this.#stmt.search.all({ offset, limit, guid, nid, jobGuid, rid, sid, channel, nsrc, ntgt, notes, tconf, onlyTNotes: onlyTNotes ? 1 : 0, q, minTS, maxTS, translationProvider }).map(sqlTransformer.decode);
            return tus;
        } catch (error) {
            throw new Error(`${error.code}: ${error.message}`);
        }
    }

    async getLowCardinalityColumns() {
        this.#stmt.getLowCardinalityColumns ??= this.#db.prepare(/* sql */`
            SELECT
                GROUP_CONCAT(DISTINCT q) q,
                GROUP_CONCAT(DISTINCT translationProvider) translationProvider,
                GROUP_CONCAT(DISTINCT tuProps->>'$.tconf') tconf
            FROM ${this.#tusTable} JOIN jobs USING (jobGuid);
        `);
        const enumValues = {};
        const result = this.#stmt.getLowCardinalityColumns.get();
        for (const [key, value] of Object.entries(result)) {
            value !== null && (enumValues[key] = value.split(','));
        }
        return enumValues;
    }
}
