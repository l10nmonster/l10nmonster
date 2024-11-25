import {
    existsSync,
    unlinkSync,
} from 'fs';
import Database from 'better-sqlite3';
import { utils } from '@l10nmonster/helpers';

export class SQLTMDelegate {
    #db;
    #getGuids;
    #getEntry;
    #setEntry;
    #getEntryByFlatSrc;
    #getJobs;
    #getJob;
    #setJob;

    constructor(tmBasePathName, jobs) {
        const dbPathName = `${tmBasePathName}.sqlite`;
        let createDB = false;
        if (existsSync(dbPathName)) {
            // these are all the jobs currently in the job store
            const jobMap = Object.fromEntries(jobs);
            this.#db = new Database(dbPathName);
            const getJobGuids = this.#db.prepare('SELECT jobGuid FROM jobs;');
            const rows = getJobGuids.all();
            const extraJobs = rows.filter(row => !jobMap[row.jobGuid]);
            if (extraJobs.length > 0) {
                // nuke the cache if jobs were removed
                l10nmonster.logger.info(`Nuking existing TM ${dbPathName}`);
                this.#db.close();
                unlinkSync(dbPathName);
                createDB = true;
            }
        } else {
            createDB = true;
        }
        if (createDB) {
            this.#db = new Database(dbPathName);
            this.#db.exec('CREATE TABLE tus(guid TEXT NOT NULL PRIMARY KEY, entry TEXT, flatSrc TEXT);\
                CREATE TABLE jobs(jobGuid TEXT NOT NULL PRIMARY KEY, status TEXT, updatedAt TEXT, translationProvider TEXT, units NUMBER);');
        }
        this.#getGuids = this.#db.prepare('SELECT guid FROM tus ORDER BY ROWID');
        this.#getEntry = this.#db.prepare('SELECT entry FROM tus WHERE guid = ?');
        this.#setEntry = this.#db.prepare('INSERT INTO tus (guid, entry, flatSrc) VALUES (@guid, @entry, @flatSrc)\
            ON CONFLICT (guid)\
                DO UPDATE SET entry = excluded.entry, flatSrc = excluded.flatSrc\
            WHERE excluded.guid = tus.guid;');
        this.#getEntryByFlatSrc = this.#db.prepare('SELECT entry FROM tus WHERE flatSrc = ?');
        this.#getJobs = this.#db.prepare('SELECT * FROM jobs ORDER BY ROWID');
        this.#getJob = this.#db.prepare('SELECT * FROM jobs WHERE jobGuid = ?');
        this.#setJob = this.#db.prepare('INSERT INTO jobs (jobGuid, status, updatedAt, translationProvider, units) VALUES (@jobGuid, @status, @updatedAt, @translationProvider, @units)\
            ON CONFLICT (jobGuid)\
                DO UPDATE SET status = excluded.status, updatedAt = excluded.updatedAt, translationProvider = excluded.translationProvider, units = excluded.units\
            WHERE excluded.jobGuid = jobs.jobGuid;');
    }

    getGuids() {
        return this.#getGuids.all().map(row => row.guid);
    }

    getEntryByGuid(guid) {
        const rawEntry = this.#getEntry.get(guid)?.entry;
        return rawEntry && JSON.parse(rawEntry);
    }

    setEntry(entry) {
        const result = this.#setEntry.run({
            guid: entry.guid,
            entry: JSON.stringify(entry),
            flatSrc: utils.flattenNormalizedSourceToOrdinal(entry.nsrc),
        });
        result.changes !== 1 && console.dir(result)
    }

    getAllEntriesBySrc(src) {
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(src);
        return this.#getEntryByFlatSrc.all(flattenedSrc).map(row => JSON.parse(row.entry));
    }

    getJobsMeta() {
        const rows = this.#getJobs.all();
        return Object.fromEntries(rows.map(row => {
            const { jobGuid, ...status } = row;
            return [ jobGuid, status ];
        }));
    }

    getJobStatus(jobGuid) {
        const jobMeta = this.#getJob.get(jobGuid);
        return [ jobMeta?.status, jobMeta?.updatedAt ];
    }

    updateJobStatus(jobGuid, status, updatedAt, translationProvider, units) {
        const result = this.#setJob.run({ jobGuid, status, updatedAt, translationProvider, units });
        result.changes !== 1 && console.dir(result)
    }

    commit() {
        this.#db.close();
    }
}
