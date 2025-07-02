import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { createSQLObjectTransformer } from './index.js';

const sqlTransformer = createSQLObjectTransformer(['nstr', 'nsrc', 'ntgt', 'notes', 'tuProps', 'segProps'], ['tuProps', 'segProps']);

export class TuDAL {
    #db;
    #tusTable;
    #stmt = {}; // prepared statements
    #flatSrcIdxInitialized = false; // used to add the index as late as possible

    constructor(db, tusTable) {
        this.#db = db;
        this.#tusTable = tusTable;
        db.exec(/* sql */`
CREATE TABLE IF NOT EXISTS ${tusTable} (
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
    PRIMARY KEY (guid, jobGuid)
);
CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_jobGuid
ON ${this.#tusTable} (jobGuid);
`);
        db.function(
            'flattenNormalizedSourceToOrdinal',
            { deterministic: true },
            nsrc => utils.flattenNormalizedSourceToOrdinal(JSON.parse(nsrc))
        );
    }

    getGuids() {
        this.#stmt.getGuids ??= this.#db.prepare(/* sql */`SELECT DISTINCT guid FROM ${this.#tusTable} ORDER BY ROWID`).pluck();
        return this.#stmt.getGuids.all();
    }

    getEntry(guid) {
        this.#stmt.getEntry ??= this.#db.prepare(/* sql */`
SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps
FROM ${this.#tusTable}
WHERE guid = ?
ORDER BY q DESC, ts DESC
LIMIT 1`);
        const tuRow = this.#stmt.getEntry.get(guid);
        return tuRow ? sqlTransformer.decode(tuRow) : undefined;
    }

    getEntriesByJobGuid(jobGuid) {
        this.#stmt.getEntriesByJobGuid ??= this.#db.prepare(/* sql */`
SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps
FROM ${this.#tusTable}
WHERE jobGuid = ?
ORDER BY tuOrder`);
        const tuRows = this.#stmt.getEntriesByJobGuid.all(jobGuid);
        return tuRows.map(sqlTransformer.decode);
    }

    setEntry(tu) {
        this.#stmt.setEntry ??= this.#db.prepare(/* sql */`
            INSERT INTO ${this.#tusTable} (jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuOrder, tuProps)
            VALUES (@jobGuid, @guid, @rid, @sid, @nsrc, @ntgt, @notes, @q, @ts, @tuOrder, @tuProps)
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

    getExactMatches(nsrc) {
        this.#stmt.createFlatSrcIdx ??= this.#db.prepare(/* sql */`
CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_flatSrc
ON ${this.#tusTable} (flattenNormalizedSourceToOrdinal(nsrc));`);
        this.#stmt.getEntriesByFlatSrc ??= this.#db.prepare(/* sql */`
SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps FROM ${this.#tusTable}
WHERE flattenNormalizedSourceToOrdinal(nsrc) = ?`);
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

    deleteEntriesByJobGuid(jobGuid) {
        this.#stmt.deleteEntriesByJobGuid ??= this.#db.prepare(`DELETE FROM ${this.#tusTable} WHERE jobGuid = ?`);
        return this.#stmt.deleteEntriesByJobGuid.run(jobGuid);
    }

    getStats() {
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

    getActiveContentTranslationStatus(sourceLang, targetLang) {
        this.#stmt.getActiveContentTranslationStatus ??= this.#db.prepare(/* sql */`
WITH tus AS (SELECT guid, MAX(q) q FROM ${this.#tusTable} GROUP BY 1)
SELECT
    channel,
    COALESCE(prj, 'default') prj,
    p.value minQ,
    t.q q,
    COUNT(distinct r.rid) res,
    COUNT(s.value) seg,
    SUM(words) words,
    SUM(chars) chars
FROM
    resources r,
    JSON_EACH(segments) s
    JOIN segments seg ON s.value = seg.guid,
    JSON_EACH(COALESCE(seg.plan, r.plan)) p
    LEFT JOIN tus t ON s.value = t.guid
WHERE
    sourceLang = ?
    AND p.key = ?
    AND active = true
GROUP BY 1, 2, 3, 4
ORDER BY 3 DESC, 4 DESC
;`);
        return this.#stmt.getActiveContentTranslationStatus.all(sourceLang, targetLang);
    }

    // TODO: parametrize a maximum segment parameter to limit giant jobs
    getUntranslatedContent(sourceLang, targetLang) {
        this.#stmt.getUntranslatedContent ??= this.#db.prepare(/* sql */`
WITH tus AS (SELECT guid, MAX(q) q FROM ${this.#tusTable} GROUP BY 1)
SELECT
    channel,
    prj,
    r.rid rid,
    seg.sid sid,
    seg.guid guid,
    nstr nsrc,
    notes,
    mf,
    segProps,
    p.value minQ,
    words,
    chars
FROM
    resources r,
    JSON_EACH(segments) s
    JOIN segments seg ON s.value = seg.guid,
    JSON_EACH(COALESCE(seg.plan, r.plan)) p
    LEFT JOIN tus t ON s.value = t.guid
WHERE
    sourceLang = ?
    AND p.key = ?
    AND active = true
    AND (q IS NULL OR (q != 0 AND q < p.value))
GROUP BY 1, 2, 3, 4
ORDER BY channel, prj, rid, s.key
LIMIT 10000
;`);
        const tus = this.#stmt.getUntranslatedContent.all(sourceLang, targetLang).map(sqlTransformer.decode);
        tus.forEach(tu => tu.gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc));
        return tus;
    }

    querySource(sourceLang, targetLang, whereCondition) {
        let stmt;
        try {
            stmt = this.#db.prepare(/* sql */`
WITH activeTranslations AS (
    SELECT guid, ntgt, q
    FROM (SELECT guid, ntgt, q,
        ROW_NUMBER() OVER (PARTITION BY guid ORDER BY q DESC, ts DESC) as rank
        FROM ${this.#tusTable})
    WHERE rank = 1)
SELECT
channel,
prj,
r.rid rid,
seg.sid sid,
seg.guid guid,
nstr nsrc,
ntgt,
q,
p.value minQ,
notes,
mf,
segProps,
words,
chars
FROM
resources r,
JSON_EACH(segments) s
JOIN segments seg ON s.value = seg.guid,
JSON_EACH(COALESCE(seg.plan, r.plan)) p
LEFT JOIN activeTranslations t ON s.value = t.guid
WHERE
sourceLang = ?
AND p.key = ?
AND active = true
AND ${whereCondition.replaceAll(';', '')}
GROUP BY 1, 2, 3, 4, 5
ORDER BY channel, rid, s.key
LIMIT 10000
;`);
        } catch (error) {
            throw new Error(`${error.code}: ${error.message}`);
        }
        const tus = stmt.all(sourceLang, targetLang).map(sqlTransformer.decode);
        tus.forEach(tu => tu.gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc));
        return tus;
    }
}
