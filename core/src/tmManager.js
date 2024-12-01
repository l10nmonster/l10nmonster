import * as path from 'path';
import { InMemoryTMDelegate } from './inMemoryTMDelegate.js';
import { SQLTMDelegate } from './sqliteTMDelegate.js';

function tmFactory(tmBasePathName, jobs, mode) {
    if (mode === undefined || mode === 'json' || mode === 'transient') {
        l10nmonster.logger.verbose(`Instantiating InMemoryTMDelegate ${tmBasePathName} mode ${mode}`);
        return new InMemoryTMDelegate(tmBasePathName, mode !== 'transient', jobs);
    } else if (mode === 'sql') {
        l10nmonster.logger.verbose(`Instantiating SQLTMDelegate ${tmBasePathName}`);
        return new SQLTMDelegate(tmBasePathName, jobs);
    }
    throw `Unknown TM Manager mode: ${mode}`;
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
        tm = tmFactory(path.join(this.monsterDir, tmName), jobs, this.mode);
        this.tmCache.set(tmName, tm);

        // update jobs if status has changed or new (otherwise not needed because jobs are immutable)
        const jobsToFetch = [];
        for (const [jobGuid, handle] of jobs) {
            const [ status, updatedAt ] = tm.getJobStatus(jobGuid);
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
