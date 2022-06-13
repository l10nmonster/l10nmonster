import * as path from 'path';
import {
    existsSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';
import { flattenNormalizedSourceToOrdinal } from '../normalizers/util.js';
import { cleanupTU, targetTUWhitelist } from './schemas.js';

class TM {
    dirty = false;
    constructor(sourceLang, targetLang, tmPathName, logger) {
        this.tmPathName = tmPathName;
        this.logger = logger;
        this.tm = existsSync(this.tmPathName) ?
            JSON.parse(readFileSync(this.tmPathName, 'utf8')) :
            {
                sourceLang,
                targetLang,
                jobStatus: {},
                tus: {},
            }
        ;
        this.lookUpByFlattenSrc = {};
        Object.values(this.tm.tus).forEach(tu => this.setEntryByGuid(tu.guid, tu)); // this is to generate side-effects
    }

    get guids() {
        return Object.keys(this.tm.tus);
    }

    getEntryByGuid(guid) {
        return this.tm.tus[guid];
    }

    setEntryByGuid(guid, entry) {
        // const getSpurious = (tu, whitelist) => Object.entries(tu)
        //     .filter(e => !whitelist.includes(e[0]))
        //     .map(e => e[0])
        //     .join(', ');
        // const spurious = getSpurious(entry, targetTUWhitelist);
        // spurious && console.error(spurious);
        if (!entry.guid || !Number.isInteger(entry.q) || !Number.isInteger(entry.ts) || !(typeof entry.tgt === 'string' || entry.ntgt || entry.inflight)) {
            throw `cannot set TM entry missing mandatory field: ${JSON.stringify(entry)}`;
        }
        const cleanedTU = cleanupTU(entry, targetTUWhitelist);
        this.tm.tus[guid] = cleanedTU;
        this.dirty = true;
        const flattenSrc = cleanedTU.nsrc ? flattenNormalizedSourceToOrdinal(cleanedTU.nsrc) : cleanedTU.src;
        this.lookUpByFlattenSrc[flattenSrc] ??= [];
        !this.lookUpByFlattenSrc[flattenSrc].includes(cleanedTU) && this.lookUpByFlattenSrc[flattenSrc].push(cleanedTU);
    }

    getAllEntriesBySrc(src) {
        const flattenSrc = Array.isArray(src) ? flattenNormalizedSourceToOrdinal(src) : src;
        return this.lookUpByFlattenSrc[flattenSrc] || [];
    }

    getJobStatus(jobGuid) {
        return this.tm.jobStatus[jobGuid];
    }

    setJobStatus(jobGuid, status) {
        if (this.tm.jobStatus[jobGuid] !== status) {
            this.tm.jobStatus[jobGuid] = status;
            this.dirty = true;
        }
    }

    async commit() {
        if (this.dirty) {
            this.logger.info(`Updating ${this.tmPathName}...`);
            await fs.writeFile(this.tmPathName, JSON.stringify(this.tm, null, '\t'), 'utf8');
            this.dirty = false;
        }
    }

    async processJob(jobResponse, jobRequest) {
        const requestedUnits = (jobRequest?.tus ?? []).reduce((p,c) => (p[c.guid] = c, p), {});
        const { jobGuid, status, inflight, tus } = jobResponse;
        if (inflight) {
            for (const guid of inflight) {
                const reqEntry = requestedUnits[guid] ?? {};
                const tmEntry = this.getEntryByGuid(guid);
                if (!tmEntry) {
                    this.setEntryByGuid(guid, { ...reqEntry, ts: jobResponse.ts, q: 0, jobGuid, inflight: true });
                }
            }
        }
        if (tus) {
            for (const tu of tus) {
                const tmEntry = this.getEntryByGuid(tu.guid);
                const reqEntry = requestedUnits[tu.guid] ?? {};

                // this is convoluted because tmEntry.ts may be undefined
                // also note that this may result in non-deterministic behavior (equal ts means later one wins)
                const isNewish = !(tmEntry?.ts > tu.ts);
                if (!tmEntry || tmEntry.q < tu.q || (tmEntry.q === tu.q && isNewish)) {
                    this.setEntryByGuid(tu.guid, { ...reqEntry, ts: jobResponse.ts, ...tu, jobGuid });
                }
            }
        }
        this.setJobStatus(jobGuid, status);
        await this.commit();
    }
}

export default class TMManager {
    constructor({ monsterDir, jobStore, ctx }) {
        this.monsterDir = monsterDir;
        this.jobStore = jobStore;
        this.ctx = ctx;
        this.tmCache = {};
        this.generation = new Date().getTime();
    }

    async getTM(sourceLang, targetLang) {
        const tmFileName = `tmCache_${sourceLang}_${targetLang}.json`;
        let tm = this.tmCache[tmFileName];
        if (!tm) {
            tm = new TM(sourceLang, targetLang, path.join(this.monsterDir, tmFileName), this.ctx.logger);
            this.tmCache[tmFileName] = tm;
        }
        if (tm.generation !== this.generation) {
            tm.generation = this.generation;
            const jobs = (await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang))
                .filter(e => [ 'pending', 'done' ].includes(e[1]));
            for (const [jobGuid, status] of jobs) {
                if (tm.getJobStatus(jobGuid) !== status) {
                    this.ctx.logger.info(`Applying job ${jobGuid} to the ${sourceLang} -> ${targetLang} TM...`);
                    const jobResponse = await this.jobStore.getJob(jobGuid);
                    const jobRequest = await this.jobStore.getJobRequest(jobGuid);
                    await tm.processJob(jobResponse, jobRequest);
                }
            }
        }
        return tm;
    }
}
