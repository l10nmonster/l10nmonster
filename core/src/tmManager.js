import * as path from 'path';
import { InMemoryTMDelegate } from './inMemoryTMDelegate.js';
import { SQLTMDelegate } from './sqliteTMDelegate.js';

class TM {
    #isDirty = false;

    constructor(tmBasePathName, jobs, mode) {
        if (mode === undefined || mode === 'json' || mode === 'transient') {
            this.delegate = new InMemoryTMDelegate(tmBasePathName, mode !== 'transient', jobs);
        } else if (mode === 'sql') {
            this.delegate = new SQLTMDelegate(tmBasePathName, jobs);
        } else {
            throw `Unknown TM Manager mode: ${mode}`;
        }
    }

    get guids() {
        return this.delegate.getGuids();
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
        return this.delegate.getAllEntriesBySrc(src);
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
                    this.setEntry({ ...reqEntry, q: 0, jobGuid, inflight: true, ts: 0 });
                }
            }
        }
        if (tus) {
            for (const tu of tus) {
                const tmEntry = this.getEntryByGuid(tu.guid);
                const reqEntry = requestedUnits[tu.guid] ?? {};
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
    constructor({ monsterDir, jobStore, parallelism, mode }) {
        this.monsterDir = monsterDir;
        this.jobStore = jobStore;
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
        tm = new TM(path.join(this.monsterDir, tmName), jobs, this.mode);
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
            l10nmonster.logger.verbose(`Fetched chunk of ${jobPromises.length} jobs`);
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
