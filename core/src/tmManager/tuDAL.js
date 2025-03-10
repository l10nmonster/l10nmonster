import { L10nContext, utils } from '@l10nmonster/core';

export class TuDAL {
    #db;
    #tusTable;
    #stmt = {}; // prepared statements
    #lazyFlatSrcIdx = true; // used to add the index as late as possible

    constructor(db, tusTable) {
        this.#db = db;
        this.#tusTable = tusTable;
        db.exec(`
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
        this.#stmt.getGuids ??= this.#db.prepare(`SELECT DISTINCT guid FROM ${this.#tusTable} ORDER BY ROWID`).pluck();
        return this.#stmt.getGuids.all();
    }

    getEntry(guid) {
        this.#stmt.getEntry ??= this.#db.prepare(`SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps FROM ${this.#tusTable} WHERE guid = ? ORDER BY q DESC, ts DESC LIMIT 1`);
        const tuRow = this.#stmt.getEntry.get(guid);
        if (tuRow) {
            // need to extract and parse all JSON props
            const { nsrc, ntgt, notes, tuProps, ...otherProps } = tuRow;
            return {
                nsrc: nsrc ? JSON.parse(nsrc) : undefined,
                ntgt: ntgt ? JSON.parse(ntgt) : undefined,
                notes: notes ? JSON.parse(notes) : undefined,
                ...otherProps,
                ...tuProps && JSON.parse(tuProps),
            };
        }
    }

    getEntriesByJobGuid(jobGuid) {
        this.#stmt.getEntriesByJobGuid ??= this.#db.prepare(`SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps FROM ${this.#tusTable} WHERE jobGuid = ? ORDER BY tuOrder`);
        const tuRows = this.#stmt.getEntriesByJobGuid.all(jobGuid);
        return tuRows.map(({ nsrc, ntgt, notes, tuProps, ...otherProps }) => ({
            nsrc: nsrc ? JSON.parse(nsrc) : undefined,
            ntgt: ntgt ? JSON.parse(ntgt) : undefined,
            notes: notes ? JSON.parse(notes) : undefined,
            ...otherProps,
            ...tuProps && JSON.parse(tuProps),
        }));
    }

    setEntry(tu) {
        this.#stmt.setEntry ??= this.#db.prepare(`
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
        const result = this.#stmt.setEntry.run({
            jobGuid,
            guid,
            rid,
            sid,
            nsrc: JSON.stringify(nsrc),
            ntgt: JSON.stringify(ntgt),
            notes: JSON.stringify(notes),
            q,
            ts,
            tuOrder,
            tuProps: JSON.stringify(tuProps),
            // TODO: populate inflight?
        });
        if (result.changes !== 1) {
            throw new Error(`Expecting to change a row but changed: ${result.changes}`);
        }
    }

    getExactMatches(nsrc) {
        this.#stmt.createFlatSrcIdx ??= this.#db.prepare(`
CREATE INDEX IF NOT EXISTS idx_${this.#tusTable}_flatSrc
ON ${this.#tusTable} (flattenNormalizedSourceToOrdinal(nsrc));`);
        this.#stmt.getEntriesByFlatSrc ??= this.#db.prepare(`
SELECT jobGuid, guid, rid, sid, nsrc, ntgt, notes, q, ts, tuProps FROM ${this.#tusTable}
WHERE flattenNormalizedSourceToOrdinal(nsrc) = ?`);
        // try to delay creating the index until it is actually needed
        if (this.#lazyFlatSrcIdx) {
            L10nContext.logger.verbose(`Creating FlatSrcIdx for table ${this.#tusTable}...`);
            this.#stmt.createFlatSrcIdx.run();
            this.#lazyFlatSrcIdx = false;
        }
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(nsrc);
        const tuRows = this.#stmt.getEntriesByFlatSrc.all(flattenedSrc);
        return tuRows.map(({ nsrc, ntgt, notes, tuProps, ...otherProps }) => ({
            nsrc: nsrc ? JSON.parse(nsrc) : undefined,
            ntgt: ntgt ? JSON.parse(ntgt) : undefined,
            notes: notes ? JSON.parse(notes) : undefined,
            ...otherProps,
            ...tuProps && JSON.parse(tuProps),
        }));
    }

    deleteEntriesByJobGuid(jobGuid) {
        this.#stmt.deleteEntriesByJobGuid ??= this.#db.prepare(`DELETE FROM ${this.#tusTable} WHERE jobGuid = ?`);
        return this.#stmt.deleteEntriesByJobGuid.run(jobGuid);
    }

    getStats() {
        this.#stmt.getStats ??= this.#db.prepare(`
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
}
