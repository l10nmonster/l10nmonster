import * as path from 'path';
import {
    existsSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';
import {
    createHash,
} from 'crypto';  

function generateFullyQualifiedGuid(rid, sid, str) {
    const sidContentHash = createHash('sha256');
    sidContentHash.update(`${rid}|${sid}|${str}`, 'utf8');
    return sidContentHash.digest().toString('base64');
}

class TM {
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
    
    getEntry(rid, sid, str) {
        return this.tm.tus[generateFullyQualifiedGuid(rid, sid, str)];
    }

    getJobStatus(jobId) {
        return this.tm.jobStatus[jobId];
    }

    get translator() {
        const tm = this.tm;
        const verbose = this.verbose;
        return async function translate(rid, sid, str) {
            const guid = generateFullyQualifiedGuid(rid, sid, str);
            if (!(guid in tm.tus)) {
                verbose && console.log(`Couldn't find ${sourceLang}_${targetLang} entry for ${rid}+${sid}+${str}`);
            }
            return tm.tus[guid]?.str ?? str; // falls back to source string
        }
    }

    async commit() {
        this.verbose && console.log(`Updating ${this.tmPathName}...`);
        await fs.writeFile(this.tmPathName, JSON.stringify(this.tm, null, '\t'), 'utf8');
    }

    async processJob(jobResponse) {
        const { jobId, status, inflight, tus } = jobResponse;
        const tmTus = this.tm.tus;
        const ts = jobResponse.ts || this.generation;
        let dirty = this.tm.jobStatus[jobId] !== status;
        if (inflight) {
            for (const guid of inflight) {
                if (!(guid in tmTus)) {
                    tmTus[guid] = { q: 0, jobId };
                    dirty = true;
                }
            }
        }
        if (tus) {
            for (const tu of tus) {         
                if (!tmTus[tu.guid] || tmTus[tu.guid].q < tu.q) {
                    tmTus[tu.guid] = { ...tu, jobId, ts };
                    dirty = true;
                }
            }
        }
        if (dirty) {
            this.tm.jobStatus[jobId] = status;
            await this.commit();
        }
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
