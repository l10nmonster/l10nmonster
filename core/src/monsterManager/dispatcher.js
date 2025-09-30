import { logVerbose, logInfo, logWarn } from '../l10nContext.js';

export default class Dispatcher {
    #providerPipeline;
    #providerMap;
    #tmm;

    constructor(providers) {
        this.#providerPipeline = providers;
        this.#providerMap = new Map(providers.map(provider => [provider.id.toLowerCase(), provider]));
    }

    async init(mm) {
        this.#tmm = mm.tmm;
        for (const provider of Object.values(this.#providerPipeline)) {
            typeof provider.init === 'function' && await provider.init(mm);
        }
    }

    get providers() {
        return this.#providerPipeline;
    }

    getProvider(id) {
        const provider = this.#providerMap.get(id.toLowerCase());
        if (!provider) {
            throw new Error(`Provider with id ${id} not found`);
        }
        return provider;
    }

    async createJobs(job, options = {}) {
        const {
            providerList,
            ...providerOptions
        } = options;
        const jobs = [];
        const pipeline = providerList ? providerList.map(id => this.getProvider(id)) : this.#providerPipeline;
        let providerIdx = 0;
        while (job.tus.length > 0 && providerIdx < pipeline.length) {
            const provider = pipeline[providerIdx];
            const createdJob = await provider.create(job, providerOptions);
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

    async startJobs(jobs, options) {
        const startedJobs = [];
        for (const job of jobs) {
            job.jobGuid = await this.#tmm.generateJobGuid();
            options.instructions && (job.instructions = options.instructions);
            const provider = this.getProvider(job.translationProvider);
            logInfo`Starting job ${job.jobGuid} with provider ${job.translationProvider}...`;
            const jobResponse = { ...await provider.start(job) };
            const blockIterator = provider.processJob(jobResponse, job);
            blockIterator && await this.#tmm.saveTmBlock(blockIterator);
            const { sourceLang, targetLang, jobGuid, translationProvider, status, statusDescription } = jobResponse;
            startedJobs.push({ sourceLang, targetLang, jobGuid, translationProvider, status, statusDescription });
        }
        return startedJobs;
    }

    async updateJob(jobGuid) {
        const pendingJob = await this.#tmm.getJob(jobGuid);
        if (pendingJob.status === 'pending') {
            logInfo`Updating job ${jobGuid}...`;
            const provider = this.getProvider(pendingJob.translationProvider);
            const jobResponse = await provider.continue(pendingJob);
            if (jobResponse) {
                const blockIterator = provider.processJob(jobResponse, pendingJob);
                blockIterator && await this.#tmm.saveTmBlock(blockIterator);
                logVerbose`Got status ${jobResponse.status} with ${jobResponse.tus.length} ${[jobResponse.tus, 'tu', 'tus']} segments for job ${jobGuid} and ${jobResponse.inflight?.length ?? 0} ${[jobResponse.inflight?.length ?? 0, 'tu', 'tus']} in flight`;
                if (jobResponse?.status === 'pending') {
                    logInfo`Got ${jobResponse.tus.length} translations for job ${pendingJob.jobGuid} but there are still ${jobResponse.inflight?.length} translations in flight`;
                    // if (options.partial) {
                    //     const { inflight, ...doneResponse } = jobResponse;
                    //     doneResponse.status = 'done';
                    //     await this.processJob(doneResponse, pendingJob);
                    //     const newRequest = { ...pendingJob };
                    //     const newManifest = await mm.tmm.createJobManifest();
                    //     const originalJobGuid = jobResponse.originalJobGuid ?? jobResponse.jobGuid;
                    //     newRequest.originalJobGuid = originalJobGuid;
                    //     newRequest.jobGuid = newManifest.jobGuid;
                    //     newRequest.tus = newRequest.tus.filter(tu => inflight.includes(tu.guid));
                    //     // eslint-disable-next-line no-unused-vars
                    //     const { tus, ...newResponse } = doneResponse;
                    //     newResponse.originalJobGuid = originalJobGuid;
                    //     newResponse.jobGuid = newManifest.jobGuid;
                    //     newResponse.inflight = inflight;
                    //     newResponse.status = 'pending';
                    //     await this.processJob(newResponse, newRequest);
                    // }
                }
            } else {
                logWarn`Got no response for job ${jobGuid}`;
            }
            return jobResponse;
        }
        throw new Error(`Can't update job ${jobGuid} because it is not pending`);
    }
}
