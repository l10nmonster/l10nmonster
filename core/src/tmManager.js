import * as path from 'path';
import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { utils } from '@l10nmonster/helpers';

class TM {
    #tmPathName;
    #lookUpByFlattenSrc = {};
    #jobStatus;
    #tus;
    #isDirty = false;

    constructor(sourceLang, targetLang, tmPathName, configSeal, jobs, persistTMCache) {
        this.#tmPathName = tmPathName;
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.configSeal = configSeal;
        this.#jobStatus = {};
        this.#tus = {};
        this.persistTMCache = persistTMCache;

        if (persistTMCache && existsSync(tmPathName)) {
            const tmData = JSON.parse(readFileSync(tmPathName, 'utf8'));
            const jobMap = Object.fromEntries(jobs);
            const extraJobs = Object.keys(tmData?.jobStatus ?? {}).filter(jobGuid => !jobMap[jobGuid]);
            // nuke the cache if config seal is broken or jobs were removed
            if (!(tmData?.configSeal === configSeal) || extraJobs.length > 0) {
                this.#jobStatus = {};
                this.#tus = {};
                l10nmonster.logger.info(`Nuking existing TM ${tmPathName}`);
            } else {
                this.#jobStatus = tmData.jobStatus;
                Object.values(tmData.tus).forEach(tu => this.setEntry(tu));
            }
        }
    }

    get guids() {
        return Object.keys(this.#tus);
    }

    getEntryByGuid(guid) {
        return this.#tus[guid];
    }

    setEntry(entry) {
        try {
            const cleanedTU = l10nmonster.TU.asPair(entry);
            Object.freeze(cleanedTU);
            this.#tus[entry.guid] = cleanedTU;
            const flattenSrc = utils.flattenNormalizedSourceToOrdinal(cleanedTU.nsrc);
            this.#lookUpByFlattenSrc[flattenSrc] ??= [];
            !this.#lookUpByFlattenSrc[flattenSrc].includes(cleanedTU) && this.#lookUpByFlattenSrc[flattenSrc].push(cleanedTU);
        } catch (e) {
            l10nmonster.logger.verbose(`Not setting TM entry: ${e}`);
        }
    }

    getAllEntriesBySrc(src) {
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(src);
        return this.#lookUpByFlattenSrc[flattenedSrc] || [];
    }

    // get status of job in the TM (if it exists)
    getJobStatus(jobGuid) {
        const jobMeta = this.#jobStatus[jobGuid];
        return [ jobMeta?.status, jobMeta?.updatedAt ];
    }

    async commit() {
        if (this.#isDirty) {
            if (this.persistTMCache) {
                l10nmonster.logger.info(`Updating ${this.#tmPathName}...`);
                const tmData = { ...this, jobStatus: this.#jobStatus, tus: this.#tus };
                writeFileSync(this.#tmPathName, JSON.stringify(tmData, null, '\t'), 'utf8');
            } else {
                l10nmonster.logger.info(`Cache not updated...`);
            }
        }
    }

    async processJob(jobResponse, jobRequest) {
        this.#isDirty = true;
        const requestedUnits = {};
        jobRequest?.tus && jobRequest.tus.forEach(tu => requestedUnits[tu.guid] = tu);
        const { jobGuid, status, inflight, tus, updatedAt, translationProvider } = jobResponse;
        if (inflight) {
            for (const guid of inflight) {
                const reqEntry = requestedUnits[guid] ?? {};
                const tmEntry = this.getEntryByGuid(guid);
                if (!tmEntry) {
                    this.setEntry({ ...reqEntry, q: 0, jobGuid, inflight: true });
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
                    this.setEntry(rectifiedTU);
                }
            }
        }
        this.#jobStatus[jobGuid] = { status, updatedAt, translationProvider, units: tus?.length ?? inflight?.length ?? 0 };
    }

    getJobsMeta() {
        return this.#jobStatus;
    }
}

export default class TMManager {
    constructor({ monsterDir, jobStore, configSeal, parallelism, mode }) {
        this.monsterDir = monsterDir;
        this.jobStore = jobStore;
        this.configSeal = configSeal;
        this.tmCache = new Map();
        this.generation = new Date().getTime();
        this.parallelism = parallelism ?? 8;
        this.persistTMCache = mode !== 'transient';
    }

    async getTM(sourceLang, targetLang) {
        const tmFileName = `tmCache_${sourceLang}_${targetLang}.json`;
        let tm = this.tmCache.get(tmFileName);
        if (tm) {
            return tm;
        }
        const jobs = (await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => [ 'pending', 'done' ].includes(e[1].status));
        if (!tm) {
            tm = new TM(sourceLang, targetLang, path.join(this.monsterDir, tmFileName), this.configSeal, jobs, this.persistTMCache);
            this.tmCache.set(tmFileName, tm);
        }
        const jobsToFetch = [];
        for (const [jobGuid, handle] of jobs) {
            const [ status, updatedAt ] = tm.getJobStatus(jobGuid);
            // update jobs if status has changed (otherwise not needed because immutable)
            if (status !== handle.status) {
                jobsToFetch.push({
                    jobHandle: handle[handle.status],
                    jobRequestHandle: handle.req,
                    tmUpdatedAt: updatedAt,
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
                    await tm.processJob(jobResponse, jobRequest);
                }
            }
        }
        return tm;
    }

    async shutdown() {
        for (const tm of this.tmCache.values()) {
            await tm.commit();
        }
    }
}
