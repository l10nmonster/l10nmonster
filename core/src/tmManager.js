import * as path from 'path';
import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { utils } from '@l10nmonster/helpers';

class InMemoryTMDelegate {
    #configSeal;
    #tmPathName;
    #persistTMCache;
    #tus;
    #lookUpByFlattenSrc = {};
    #jobStatus;

    constructor(tmBasePathName, persistTMCache, configSeal, jobs) {
        this.#configSeal = configSeal;
        this.#tmPathName = `${tmBasePathName}.json`;
        this.#persistTMCache = persistTMCache;
        this.#tus = {};
        this.#jobStatus = {};

        if (persistTMCache && existsSync(this.#tmPathName)) {
            const tmData = JSON.parse(readFileSync(this.#tmPathName, 'utf8'));
            const jobMap = Object.fromEntries(jobs);
            const extraJobs = Object.keys(tmData?.jobStatus ?? {}).filter(jobGuid => !jobMap[jobGuid]);
            // nuke the cache if config seal is broken or jobs were removed
            if (!(tmData?.configSeal === configSeal) || extraJobs.length > 0) {
                this.#jobStatus = {};
                this.#tus = {};
                l10nmonster.logger.info(`Nuking existing TM ${this.#tmPathName}`);
            } else {
                this.#jobStatus = tmData.jobStatus;
                Object.values(tmData.tus).forEach(tu => this.setEntry(tu));
            }
        }
    }

    guids() {
        return Object.keys(this.#tus);
    }

    getEntryByGuid(guid) {
        return this.#tus[guid];
    }

    setEntry(entry) {
        this.#tus[entry.guid] = entry;
        const flattenSrc = utils.flattenNormalizedSourceToOrdinal(entry.nsrc);
        this.#lookUpByFlattenSrc[flattenSrc] ??= [];
        !this.#lookUpByFlattenSrc[flattenSrc].includes(entry) && this.#lookUpByFlattenSrc[flattenSrc].push(entry);
    }

    getAllEntriesBySrc(src) {
        return this.#lookUpByFlattenSrc[src] || [];
    }

    getJobsMeta() {
        return this.#jobStatus;
    }

    getJobStatus(jobGuid) {
        const jobMeta = this.#jobStatus[jobGuid];
        return [ jobMeta?.status, jobMeta?.updatedAt ];
    }

    updateJobStatus(jobGuid, status, updatedAt, translationProvider, units) {
        this.#jobStatus[jobGuid] = { status, updatedAt, translationProvider, units };
    }

    commit() {
        if (this.#persistTMCache) {
            l10nmonster.logger.info(`Updating ${this.#tmPathName}...`);
            const tmData = {
                configSeal:this.#configSeal,
                jobStatus: this.#jobStatus,
                tus: this.#tus,
            };
            writeFileSync(this.#tmPathName, JSON.stringify(tmData, null, '\t'), 'utf8');
        } else {
            l10nmonster.logger.info(`Cache not persisted...`);
        }
    }
}

class TM {
    #isDirty = false;

    constructor(tmBasePathName, configSeal, jobs, mode) {
        this.delegate = new InMemoryTMDelegate(tmBasePathName, mode !== 'transient', configSeal, jobs);
    }

    get guids() {
        return this.delegate.guids();
    }

    getEntryByGuid(guid) {
        return this.delegate.getEntryByGuid(guid);
    }

    setEntry(entry) {
        try {
            const cleanedTU = l10nmonster.TU.asPair(entry);
            Object.freeze(cleanedTU);
            this.delegate.setEntry(cleanedTU);
        } catch (e) {
            l10nmonster.logger.verbose(`Not setting TM entry (guid=${entry.guid}): ${e}`);
        }
    }

    getAllEntriesBySrc(src) {
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(src);
        return this.delegate.getAllEntriesBySrc(flattenedSrc);
    }

    // get status of job in the TM (if it exists)
    getJobStatus(jobGuid) {
        return this.delegate.getJobStatus(jobGuid);
    }

    commit() {
        if (this.#isDirty) {
            this.delegate.commit();
        }
    }

    processJob(jobResponse, jobRequest) {
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
        this.delegate.updateJobStatus(jobGuid, status, updatedAt, translationProvider, tus?.length ?? inflight?.length ?? 0);
    }

    getJobsMeta() {
        return this.delegate.getJobsMeta();
    }
}

export default class TMManager {
    constructor({ monsterDir, jobStore, configSeal, parallelism, mode }) {
        this.monsterDir = monsterDir;
        this.jobStore = jobStore;
        this.configSeal = configSeal;
        this.tmCache = new Map();
        this.parallelism = parallelism ?? 8;
        this.mode = mode;
    }

    async getTM(sourceLang, targetLang) {
        const tmName = `tmCache_${sourceLang}_${targetLang}`;
        let tm = this.tmCache.get(tmName);
        if (tm) {
            return tm;
        }
        const jobs = (await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => [ 'pending', 'done' ].includes(e[1].status));
        tm = new TM(path.join(this.monsterDir, tmName), this.configSeal, jobs, this.mode);
        this.tmCache.set(tmName, tm);
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
                    tm.processJob(jobResponse, jobRequest);
                }
            }
        }
        return tm;
    }

    async shutdown() {
        for (const tm of this.tmCache.values()) {
            tm.commit();
        }
    }
}
