import * as path from 'path';
import { L10nContext, TU } from '@l10nmonster/core';
import { TM } from './sqliteTM.js';

export default class TMManager {
    constructor({ jobStore, parallelism }) {
        this.jobStore = jobStore;
        this.tmCache = new Map();
        this.parallelism = parallelism ?? 8;
    }

    async getTM(sourceLang, targetLang) {
        const tmName = `tmCache_${sourceLang}_${targetLang}`;
        let tm = this.tmCache.get(tmName);
        if (tm) {
            return tm;
        }
        const jobs = (await this.getJobStatusByLangPair(sourceLang, targetLang))
            .filter(e => [ 'pending', 'done' ].includes(e[1].status));
        tm = new TM(path.join(L10nContext.baseDir, tmName), jobs);
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
                const body = await this.getJobByHandle(meta.jobHandle);
                return { meta, body };
            })());
            const fetchedJobs = await Promise.all(jobPromises);
            L10nContext.logger.verbose(`Fetched chunk of ${jobPromises.length} jobs`);
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
                    const jobRequest = await this.getJobRequestByHandle(meta.jobRequestHandle);
                    return { jobResponse: meta.jobResponse, jobRequest };
                })());
                for (const { jobResponse, jobRequest } of await Promise.all(jobPromises)) {
                    L10nContext.logger.info(`Applying job ${jobResponse?.jobGuid} to the ${sourceLang} -> ${targetLang} TM...`);
                    tm.processJob(jobResponse, jobRequest);
                }
            }
        }
        return tm;
    }

    // use cases:
    //   1 - both are passed as both are created at the same time -> may cancel if response is empty
    //   2 - only jobRequest is passed because it's blocked -> write if "blocked", cancel if "created"
    //   3 - only jobResponse is passed because it's pulled -> must write even if empty or it will show as blocked/pending
    async processJob(jobResponse, jobRequest) {
        if (jobRequest && jobResponse && !(jobResponse.tus?.length > 0 || jobResponse.inflight?.length > 0)) {
            jobResponse.status = 'cancelled';
            return;
        }
        if (jobRequest && !jobResponse && jobRequest.status === 'created') {
            jobRequest.status = 'cancelled';
            return;
        }
        // we warm up the TM first so that we don't process the same job twice in case the tm cache is cold
        const tm = await this.getTM(jobResponse.sourceLang, jobResponse.targetLang);
        const updatedAt = (L10nContext.regression ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
        if (jobRequest) {
            jobRequest.updatedAt = updatedAt;
            if (jobResponse) {
                const guidsInFlight = jobResponse.inflight ?? [];
                const translatedGuids = jobResponse?.tus?.map(tu => tu.guid) ?? [];
                const acceptedGuids = new Set(guidsInFlight.concat(translatedGuids));
                jobRequest.tus = jobRequest.tus.filter(tu => acceptedGuids.has(tu.guid));
            }
            jobRequest.tus = jobRequest.tus.map(TU.asSource);
            await this.jobStore.writeJob(jobRequest);
        }
        if (jobResponse) {
            jobResponse.updatedAt = updatedAt;
            jobResponse.tus && (jobResponse.tus = jobResponse.tus.map(TU.asTarget));
            await this.jobStore.writeJob(jobResponse);
        }
        // we update the TM in memory so that it can be reused before shutdown (e.g. when using JS API)
        // TODO: this is not great, we should have a hook so that the TM can subscribe to mutation events.
        await tm.processJob(jobResponse, jobRequest);
    }

    async getAvailableLangPairs() {
        return this.jobStore.getAvailableLangPairs();
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        return this.jobStore.getJobStatusByLangPair(sourceLang, targetLang);
    }

    async createJobManifest() {
        return this.jobStore.createJobManifest();
    }

    async writeJob(job) {
        return this.jobStore.writeJob(job);
    }

    async getJobByHandle(jobFilename) {
        return this.jobStore.getJobByHandle(jobFilename);
    }

    async getJob(jobGuid) {
        return this.jobStore.getJob(jobGuid);
    }

    async getJobRequestByHandle(jobFilename) {
        return this.jobStore.getJobRequestByHandle(jobFilename);
    }

    async getJobRequest(jobGuid) {
        return this.jobStore.getJobRequest(jobGuid);
    }

    async deleteJobRequest(jobGuid) {
        return this.jobStore.deleteJobRequest(jobGuid);
    }

    async shutdown() {
        for (const tm of this.tmCache.values()) {
            tm.commit();
        }
    }
}
