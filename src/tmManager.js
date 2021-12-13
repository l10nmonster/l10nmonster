import * as path from 'path';
import {
    existsSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';

class TM {
    dirty = false;
    constructor(sourceLang, targetLang, tmPathName) {
        this.tmPathName = tmPathName;
        this.tm = existsSync(this.tmPathName) ? 
            JSON.parse(readFileSync(this.tmPathName, 'utf8')) :
            {
                sourceLang,
                targetLang,
                jobStatus: {},
                tus: {},
            }
        ;
    }

    get size() {
        return Object.keys(this.tm.tus).length;
    }
    
    getEntryByGuid(guid) {
        return this.tm.tus[guid];
    }

    setEntryByGuid(guid, entry) {
        // const existingEntry = this.tm.tus[guid] || {};
        // this.tm.tus[guid] = { ...existingEntry, ...entry };
        this.tm.tus[guid] = entry;
        this.dirty = true;
    }

    getAllEntriesBySrc(src) {
        return Object.values(this.tm.tus).filter(e => e.src === src);
    }

    getJobStatus(jobId) {
        return this.tm.jobStatus[jobId];
    }

    setJobStatus(jobId, status) {
        if (this.tm.jobStatus[jobId] !== status) {
            this.tm.jobStatus[jobId] = status;
            this.dirty = true;
        }
    }

    async commit() {
        if (this.dirty) {
            this.verbose && console.log(`Updating ${this.tmPathName}...`);
            await fs.writeFile(this.tmPathName, JSON.stringify(this.tm, null, '\t'), 'utf8');
            this.dirty = false;
        }
    }

    async processJob(jobResponse, jobRequest) {
        const requestedUnits = (jobRequest?.tus ?? []).reduce((p,c) => (p[c.guid] = c, p), {});
        const { jobId, status, inflight, tus } = jobResponse;
        const ts = jobResponse.ts || this.generation;
        if (inflight) {
            for (const guid of inflight) {
                const reqEntry = requestedUnits[guid] || {};
                const tmEntry = this.getEntryByGuid(guid);
                if (!tmEntry) {
                    this.setEntryByGuid(guid, { ...reqEntry, q: 0, jobId, inflight: true });
                }
            }
        }
        if (tus) {
            for (const tu of tus) {         
                const tmEntry = this.getEntryByGuid(tu.guid);
                const reqEntry = requestedUnits[tu.guid] || {};
                if (!tmEntry || tmEntry.q < tu.q) {
                    this.setEntryByGuid(tu.guid, { ...reqEntry, ...tu, jobId, ts });
                }
            }
        }
        this.setJobStatus(jobId, status);
        await this.commit();
    }
}

export default class TMManager {
    constructor({ monsterDir, jobStore }) {
        this.monsterDir = monsterDir;
        this.jobStore = jobStore;
        this.tmCache = {};
        this.generation = new Date().getTime();
    }

    async getTM(sourceLang, targetLang) {
        const tmFileName = `tmCache_${sourceLang}_${targetLang}.json`;
        let tm = this.tmCache[tmFileName];
        if (!tm) {
            TM.prototype.verbose = this.verbose;
            tm = new TM(sourceLang, targetLang, path.join(this.monsterDir, tmFileName));
            this.tmCache[tmFileName] = tm;
        }
        if (tm.generation !== this.generation) {
            tm.generation = this.generation;
            const jobs = await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang);
            for (const [jobId, status] of jobs) {
                if (tm.getJobStatus(jobId) !== status) {
                    const job = await this.jobStore.getJob(jobId);
                    await tm.processJob(job);
                }
            }
        }
        return tm;
    }
}
