import * as path from 'path';
import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { utils } from '@l10nmonster/helpers';
import { targetTUWhitelist } from './schemas.js';

class TM {
    constructor(sourceLang, targetLang, tmPathName, configSeal, jobs) {
        const EMPTY_TM = {
            sourceLang,
            targetLang,
            configSeal,
            jobStatus: {},
            tus: {},
        };
        this.tmPathName = tmPathName;
        if (existsSync(tmPathName)) {
            this.tm = JSON.parse(readFileSync(tmPathName, 'utf8'));
            const jobMap = Object.fromEntries(jobs);
            const extraJobs = Object.keys(this.tm?.jobStatus ?? {}).filter(jobGuid => !jobMap[jobGuid]);
            // nuke the cache if config seal is broken or jobs were removed
            if (!(this.tm?.configSeal === configSeal) || extraJobs.length > 0) {
                this.tm = EMPTY_TM;
                l10nmonster.logger.info(`Nuking existing TM ${tmPathName}`);
            }
        } else {
            this.tm = EMPTY_TM;
        }
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
        // be backwards compatible with legacy jobs that may contain src and tgt
        entry.nsrc === undefined && entry.src !== undefined && (entry.nsrc = [ entry.src ]);
        entry.src !== undefined && delete entry.src;
        entry.ntgt === undefined && entry.tgt !== undefined && (entry.ntgt = [ entry.tgt ]);
        entry.tgt !== undefined && delete entry.tgt;
        if (!entry.guid || !Number.isInteger(entry.q) || ((!Number.isInteger(entry.ts) || !Array.isArray(entry.ntgt)) && !entry.inflight)) {
            throw `cannot set TM entry missing mandatory field: ${JSON.stringify(entry)}`;
        }

        // const getSpurious = (tu, whitelist) => Object.entries(tu)
        //     .filter(e => !whitelist.has(e[0]))
        //     .map(e => e[0])
        //     .join(', ');
        // const spurious = getSpurious(entry, targetTUWhitelist);
        // spurious && console.error(spurious);

        const cleanedTU = utils.cleanupTU(entry, targetTUWhitelist);
        Object.freeze(cleanedTU);
        this.tm.tus[guid] = cleanedTU;
        const flattenSrc = utils.flattenNormalizedSourceToOrdinal(cleanedTU.nsrc);
        this.lookUpByFlattenSrc[flattenSrc] ??= [];
        !this.lookUpByFlattenSrc[flattenSrc].includes(cleanedTU) && this.lookUpByFlattenSrc[flattenSrc].push(cleanedTU);
    }

    getAllEntriesBySrc(src) {
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(src);
        return this.lookUpByFlattenSrc[flattenedSrc] || [];
    }

    getJobStatus(jobGuid) {
        return this.tm.jobStatus[jobGuid];
    }

    async commit() {
        l10nmonster.logger.info(`Updating ${this.tmPathName}...`);
        writeFileSync(this.tmPathName, JSON.stringify(this.tm, null, '\t'), 'utf8');
    }

    processJob(jobResponse, jobRequest) {
        this.dirty = true;
        const requestedUnits = {};
        jobRequest?.tus && jobRequest.tus.forEach(tu => requestedUnits[tu.guid] = tu);
        const { jobGuid, status, inflight, tus, updatedAt, translationProvider } = jobResponse;
        if (inflight) {
            for (const guid of inflight) {
                const reqEntry = requestedUnits[guid] ?? {};
                const tmEntry = this.getEntryByGuid(guid);
                if (!tmEntry) {
                    this.setEntryByGuid(guid, { ...reqEntry, q: 0, jobGuid, inflight: true });
                }
            }
        }
        if (tus) {
            for (const tu of tus) {
                const tmEntry = this.getEntryByGuid(tu.guid);
                const reqEntry = requestedUnits[tu.guid] ?? {};
                // the problem trying to refresh from source is that it's going to be stale anyway
                // and it requires all sources to be in memory. removing this since it seems to be
                // just a legacy from when we didn't capture the request
                // const srcEntry = Object.fromEntries(Object.entries(this.sourceMgr.getSourceByGuid(tu.guid) ?? {}).filter(p => refreshedFromSource.has(p[0])));
                const rectifiedTU = { ...reqEntry, ...tu, jobGuid, translationProvider };
                if (!tmEntry || tmEntry.q < tu.q || (tmEntry.q === tu.q && tmEntry.ts < rectifiedTU.ts)) {
                    this.setEntryByGuid(tu.guid, rectifiedTU);
                }
            }
        }
        this.tm.jobStatus[jobGuid] = { status, updatedAt, translationProvider, units: tus?.length ?? inflight?.length ?? 0 };
    }

    getJobsMeta() {
        return this.tm.jobStatus;
    }
}

export default class TMManager {
    constructor({ monsterDir, jobStore, configSeal, parallelism }) {
        this.monsterDir = monsterDir;
        this.jobStore = jobStore;
        this.configSeal = configSeal;
        this.tmCache = new Map();
        this.generation = new Date().getTime();
        this.parallelism = parallelism ?? 8;
    }

    async getTM(sourceLang, targetLang) {
        const jobs = (await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => [ 'pending', 'done' ].includes(e[1].status));
        const tmFileName = `tmCache_${sourceLang}_${targetLang}.json`;
        let tm = this.tmCache.get(tmFileName);
        if (!tm) {
            tm = new TM(sourceLang, targetLang, path.join(this.monsterDir, tmFileName), this.configSeal, jobs);
            this.tmCache.set(tmFileName, tm);
        }
        const jobsToFetch = [];
        for (const [jobGuid, handle] of jobs) {
            const jobInTM = tm.getJobStatus(jobGuid);
            // always try to update pending jobs (because mutable) or if status has changed
            if (handle.status === 'pending' || jobInTM?.status !== handle.status) {
                jobsToFetch.push({
                    jobHandle: handle[handle.status],
                    jobRequestHandle: handle.req,
                    tmUpdatedAt: jobInTM?.updatedAt,
                })
            }
        }
        while (jobsToFetch.length > 0) {
            const jobPromises = jobsToFetch.splice(0, this.parallelism).map(meta => (async () => {
                const body = await this.jobStore.getJobByHandle(meta.jobHandle);
                return { meta, body };
            })());
            const fetchedJobs = await Promise.all(jobPromises);
            l10nmonster.logger.verbose(`Fetched chunk of ${jobsToFetch.length} jobs`);
            const jobsRequestsToFetch = [];
            for (const job of fetchedJobs) {
                if (job.body.updatedAt !== job.meta.tmUpdatedAt) {
                    jobsRequestsToFetch.push({
                        jobRequestHandle: job.meta.jobRequestHandle,
                        jobResponse: job.body
                    });
                }
            }
            if (jobsRequestsToFetch.length > 0) {
                const jobPromises = jobsRequestsToFetch.map(meta => (async () => {
                    const jobRequest = await this.jobStore.getJobRequestByHandle(meta.jobRequestHandle);
                    return { jobResponse: meta.jobResponse, jobRequest };
                })());
                for (const { jobResponse, jobRequest } of await Promise.all(jobPromises)) {
                    l10nmonster.logger.info(`Applying job ${jobResponse?.jobGuid} to the ${sourceLang} -> ${targetLang} TM...`);
                    tm.processJob(jobResponse, jobRequest);
                }
            }
        }
        return tm;
    }

    async shutdown() {
        for (const tm of this.tmCache.values()) {
            tm.dirty && (await tm.commit());
        }
    }
}
