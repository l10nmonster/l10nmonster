import { TU, utils, L10nContext } from '@l10nmonster/core';

export default class Dispatcher {
    #providerPipeline;
    #providerMap;
    #tmm;

    constructor(providers) {
        this.#providerPipeline = providers;
        this.#providerMap = new Map(providers.map(provider => [provider.id, provider]));
    }

    async init(mm) {
        this.#tmm = mm.tmm;
        for (const provider of Object.values(this.#providerPipeline)) {
            typeof provider.init === 'function' && await provider.init(mm);
        }
    }

    async createJobs(job) {
        const jobs = [];
        let providerIdx = 0;
        while (job.tus.length > 0 && providerIdx < this.#providerPipeline.length) {
            const provider = this.#providerPipeline[providerIdx];
            const createdJob = await provider.create(job);
            if (createdJob.tus.length > 0) {
                jobs.push({ ...createdJob, translationProvider: provider.id });
                const acceptedGuids = new Set(createdJob.tus.map(tu => tu.guid));
                job.tus = job.tus.filter(tu => !acceptedGuids.has(tu.guid));
            }
            providerIdx++;
        }
        job.tus.length > 0 && jobs.push(job);
        return jobs;
    }

    async startJobs(jobs) {
        const startedJobs = [];
        for (const job of jobs) {
            job.jobGuid = this.#tmm.generateJobGuid();
            const jobResponse = { ...await this.#providerMap.get(job.translationProvider).start(job) };
            await this.processJob(jobResponse, job);
            const { sourceLang, targetLang, jobGuid, status } = jobResponse;
            startedJobs.push({ sourceLang, targetLang, jobGuid, status });
        }
        return startedJobs;
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
        }
        if (jobResponse) {
            jobResponse.updatedAt = updatedAt;
            jobResponse.tus && (jobResponse.tus = jobResponse.tus.map(TU.asTarget));
        }
        await this.#tmm.saveTmBlock(utils.getIteratorFromJobPair(jobRequest, jobResponse));
    }
}
