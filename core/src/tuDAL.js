import { L10nContext } from './l10nContext.js';

export class TUDAL {
    #stmt = {}; // prepared statements
    #lazyFlatSrcIdx = true; // used to add the index as late as possible

    constructor(db, tusTable) {
        // tus table
        db.exec(`CREATE TABLE IF NOT EXISTS ${tusTable}(jobGuid TEXT NOT NULL, guid TEXT NOT NULL, entry TEXT, flatSrc TEXT, q INTEGER, ts INTEGER, PRIMARY KEY (guid, jobGuid));`);

        this.getGuids = () => this.#stmt.getGuids.all();
        this.#stmt.getGuids = db.prepare(`SELECT guid FROM ${tusTable} ORDER BY ROWID`).pluck();

        this.getEntry = (guid) => this.#stmt.getEntry.get(guid);
        this.#stmt.getEntry = db.prepare(`SELECT entry FROM ${tusTable} WHERE guid = ? ORDER BY q DESC, ts DESC LIMIT 1`).pluck();

        /**
         * Sets or updates a translation unit (TU) in the database.
         * @param {Object} tu - The translation unit object to set or update.
         * @param {string} tu.jobGuid - The unique identifier for the job associated with the TU.
         * @param {string} tu.guid - The unique identifier for the TU.
         * @param {Object} tu.entry - The translation unit entry data.
         * @param {string} tu.flatSrc - The flattened source text for the TU.
         * @param {string} tu.q - The quality indicator for the TU.
         * @param {string} tu.ts - The timestamp for the TU.
         */
        this.setEntry = (tu) => this.#stmt.setEntry.run(tu);
        this.#stmt.setEntry = db.prepare(`INSERT INTO ${tusTable} (jobGuid, guid, entry, flatSrc, q, ts) VALUES (@jobGuid, @guid, @entry, @flatSrc, @q, @ts)
            ON CONFLICT (jobGuid, guid)
                DO UPDATE SET entry = excluded.entry, flatSrc = excluded.flatSrc, q = excluded.q, ts = excluded.ts
            WHERE excluded.jobGuid = ${tusTable}.jobGuid AND excluded.guid = ${tusTable}.guid`);

        this.getEntriesByFlatSrc = (flatSrc) => {
            if (this.#lazyFlatSrcIdx) {
                L10nContext.logger.verbose(`Creating FlatSrcIdx...`);
                this.#stmt.createFlatSrcIdx.run();
                this.#lazyFlatSrcIdx = false;
            }
            return this.#stmt.getEntriesByFlatSrc.all(flatSrc);
        };
        this.#stmt.createFlatSrcIdx = db.prepare(`CREATE INDEX IF NOT EXISTS idx_${tusTable}_flatSrc ON ${tusTable} (flatSrc)`);
        this.#stmt.getEntriesByFlatSrc = db.prepare(`SELECT entry FROM ${tusTable} WHERE flatSrc = ?`).pluck();

        this.deleteEntriesByJobGuid = (jobGuid) => this.#stmt.deleteEntriesByJobGuid.run(jobGuid);
        this.#stmt.deleteEntriesByJobGuid = db.prepare(`DELETE FROM ${tusTable} WHERE jobGuid = ?`);
    }
}
