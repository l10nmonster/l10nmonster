import { L10nContext, TU, utils } from '@l10nmonster/core';
import {
    existsSync,
} from 'fs';
import Database from 'better-sqlite3';

export class TM {
    #db;
    #stmt;
    #lazyFlatSrcIdx = true; // used to add the index as late as possible

    constructor(tmBasePathName, jobs) {
        const dbPathName = `${tmBasePathName}.sqlite`;
        const existingDB = existsSync(dbPathName);
        this.#db = new Database(dbPathName);
        if (existingDB) {
            // these are all the jobs currently in the job store
            const jobMap = Object.fromEntries(jobs);

            // we only need to invalidate possible removed jobs from the job store
            // (which shouldn't happen because of immutability but life gives you lemons sometimes...)
            // job status updates and additions are taken care of by the TM Manager
            const jobGuids = this.#db.prepare('SELECT jobGuid FROM jobs;').pluck().all();
            const extraJobs = jobGuids.filter(jobGuid => !jobMap[jobGuid]);
            const nukeJob = this.#db.prepare('DELETE FROM jobs WHERE jobGuid = ?');
            const nukeTus = this.#db.prepare('DELETE FROM tus WHERE jobGuid = ?');
            for (const jobGuid of extraJobs) {
                L10nContext.logger.info(`Nuking extraneous job: ${jobGuid}`);
                nukeJob.run(jobGuid);
                nukeTus.run(jobGuid);
            }
        } else {
            this.#db.exec(`CREATE TABLE tus(jobGuid TEXT NOT NULL, guid TEXT NOT NULL, entry TEXT, flatSrc TEXT, q INTEGER, ts INTEGER, PRIMARY KEY (guid, jobGuid));
                CREATE TABLE jobs(jobGuid TEXT NOT NULL PRIMARY KEY, status TEXT, updatedAt TEXT, translationProvider TEXT);`);
        }

        // prepared statements
        this.#stmt = {
            getGuids: this.#db.prepare('SELECT guid FROM tus ORDER BY ROWID').pluck(),
            getEntry: this.#db.prepare('SELECT entry FROM tus WHERE guid = ? ORDER BY q DESC, ts DESC LIMIT 1').pluck(),
            setEntry: this.#db.prepare(`INSERT INTO tus (jobGuid, guid, entry, flatSrc, q, ts) VALUES (@jobGuid, @guid, @entry, @flatSrc, @q, @ts)
                ON CONFLICT (jobGuid, guid)
                    DO UPDATE SET entry = excluded.entry, flatSrc = excluded.flatSrc, q = excluded.q, ts = excluded.ts
                WHERE excluded.jobGuid = tus.jobGuid AND excluded.guid = tus.guid`),
            getEntryByFlatSrc: this.#db.prepare('SELECT entry FROM tus WHERE flatSrc = ?').pluck(),

            getJobsMeta: this.#db.prepare(`SELECT jobGuid, status, updatedAt, translationProvider, count(guid) units FROM jobs LEFT JOIN tus USING(jobGuid)
                GROUP BY 1, 2, 3, 4 ORDER BY jobs.ROWID`),
            getJob: this.#db.prepare('SELECT status, updatedAt FROM jobs WHERE jobGuid = ?'),
            setJob: this.#db.prepare(`INSERT INTO jobs (jobGuid, status, updatedAt, translationProvider) VALUES (@jobGuid, @status, @updatedAt, @translationProvider)
                ON CONFLICT (jobGuid)
                    DO UPDATE SET status = excluded.status, updatedAt = excluded.updatedAt, translationProvider = excluded.translationProvider
                WHERE excluded.jobGuid = jobs.jobGuid`),
            createFlatSrcIdx: this.#db.prepare('CREATE INDEX IF NOT EXISTS idx_tus_flatSrc ON tus (flatSrc)'),
        };
    }

    get guids() {
        return this.#stmt.getGuids.all();
    }

    getEntryByGuid(guid) {
        const rawEntry = this.#stmt.getEntry.get(guid);
        return rawEntry && JSON.parse(rawEntry);
    }

    #setEntry(tu) {
        try {
            const result = this.#stmt.setEntry.run({
                jobGuid: tu.jobGuid,
                guid: tu.guid,
                entry: JSON.stringify(tu),
                flatSrc: utils.flattenNormalizedSourceToOrdinal(tu.nsrc),
                q: tu.q,
                ts: tu.ts,
            });
            result.changes !== 1 && L10nContext.logger.info(`Expecting to change a row but changed: ${result}`);
        } catch (e) {
            L10nContext.logger.verbose(`Not setting TM entry (guid=${tu.guid}): ${e}`);
        }
    }

    getExactMatches(nsrc) {
        if (this.#lazyFlatSrcIdx) {
            L10nContext.logger.verbose(`Creating FlatSrcIdx...`);
            this.#stmt.createFlatSrcIdx.run();
            this.#lazyFlatSrcIdx = false;
        }
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(nsrc);
        const entries = this.#stmt.getEntryByFlatSrc.all(flattenedSrc);
        const tuCandidates = entries.map(str => JSON.parse(str));
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    getJobsMeta() {
        const rows = this.#stmt.getJobsMeta.all();
        return Object.fromEntries(rows.map(row => {
            const { jobGuid, ...status } = row;
            return [ jobGuid, status ];
        }));
    }

    getJobStatus(jobGuid) {
        const jobMeta = this.#stmt.getJob.get(jobGuid);
        return [ jobMeta?.status, jobMeta?.updatedAt ];
    }

    async processJob(jobResponse, jobRequest) {
        const requestedUnits = jobRequest?.tus ? Object.fromEntries(jobRequest.tus.map(tu => [ tu.guid, tu])) : {};
        const { jobGuid, status, inflight, tus, updatedAt, translationProvider } = jobResponse;
        const writeJob = this.#db.transaction((inflight, tus) => {
            if (inflight) {
                for (const guid of inflight) {
                    const reqEntry = requestedUnits[guid] ?? {};
                    try {
                        this.#setEntry(TU.asPair({ ...reqEntry, q: 0, jobGuid, inflight: true, ts: 0 }));
                    } catch (e) {
                        L10nContext.logger.verbose(`Problems converting in-flight entry to TU: ${e}`);
                    }
                }
            }
            if (tus) {
                for (const tu of tus) {
                    try {
                        this.#setEntry(TU.fromRequestResponse(requestedUnits[tu.guid], tu, { jobGuid, translationProvider }));
                    } catch (e) {
                        L10nContext.logger.verbose(`Problems converting entry to TU: ${e}`);
                    }
                }
            }
            const result = this.#stmt.setJob.run({ jobGuid, status, updatedAt, translationProvider });
            result.changes !== 1 && L10nContext.logger.info(`Expecting to change a row but got: ${result}`);
        });
        writeJob(inflight, tus);
    }

    commit() {
        this.#db.close();
    }
}
