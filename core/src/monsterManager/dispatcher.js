import { logVerbose, logInfo, logWarn, getRegressionMode } from '../l10nContext.js';
import { TU } from '../entities/tu.js';
import { utils } from '../helpers/index.js';

/**
 * @typedef {import('../../index.js').Job} Job
 * @typedef {import('../interfaces.js').TranslationProvider} TranslationProvider
 */

/**
 * Options for creating jobs.
 * @typedef {Object} CreateJobsOptions
 * @property {string[]} [providerList] - List of provider IDs to try (in order).
 * @property {boolean} [skipQualityCheck] - Skip quality threshold checks.
 * @property {boolean} [skipGroupCheck] - Skip translation group checks.
 */

/**
 * Options for starting jobs.
 * @typedef {Object} StartJobsOptions
 * @property {string} [jobName] - Name for the job batch.
 * @property {string} [instructions] - Translation instructions for providers.
 */

/**
 * Started job summary.
 * @typedef {Object} StartedJobSummary
 * @property {string} sourceLang - Source language code.
 * @property {string} targetLang - Target language code.
 * @property {string} jobGuid - Job identifier.
 * @property {string} translationProvider - Provider ID.
 * @property {string} status - Job status.
 * @property {string} statusDescription - Human-readable status.
 */

/**
 * Dispatches translation jobs to providers in the configured pipeline.
 * Manages job creation, starting, and updating.
 */
export default class Dispatcher {
    #providerPipeline;
    #providerMap;
    #tmm;

    /**
     * Creates a new Dispatcher instance.
     * @param {TranslationProvider[]} providers - Array of translation providers in pipeline order.
     */
    constructor(providers) {
        this.#providerPipeline = providers;
        this.#providerMap = new Map(providers.map(provider => [provider.id.toLowerCase(), provider]));
    }

    /**
     * Processes job request/response pair for storage.
     * Use cases:
     *   1 - both are passed as both are created at the same time -> may cancel if response is empty
     *   2 - only jobRequest is passed because it's blocked -> write if "blocked", cancel if "created"
     *   3 - only jobResponse is passed because it's pulled -> must write even if empty or it will show as blocked/pending
     * @param {TranslationProvider} provider - The provider that handled the job.
     * @param {Job} [jobResponse] - Response from provider.
     * @param {Job} [jobRequest] - Original request.
     * @returns {Generator<unknown> | undefined} Generator for streaming results or undefined.
     */
    // eslint-disable-next-line complexity
    #processJob(provider, jobResponse, jobRequest) {
        if (jobResponse?.status === 'cancelled') {
            return;
        }
        if (jobRequest && jobResponse) {
            if (jobResponse.status === 'created' && !(jobResponse.tus?.length > 0 || jobResponse.inflight?.length > 0)) {
                jobResponse.status = 'cancelled';
                jobResponse.statusDescription = provider.statusProperties?.cancelled?.description;
                return;
            }
        }
        if (jobRequest && !jobResponse && jobRequest.status === 'created') {
            jobRequest.status = 'cancelled';
            jobRequest.statusDescription = provider.statusProperties?.cancelled?.description;
            return;
        }
        const updatedAt = (getRegressionMode() ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
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
        return utils.getIteratorFromJobPair(jobRequest, jobResponse);
    }

    /**
     * Initializes the Dispatcher and all providers.
     * @param {import('./index.js').MonsterManager} mm - The MonsterManager instance.
     * @returns {Promise<void>}
     */
    async init(mm) {
        this.#tmm = mm.tmm;
        for (const provider of Object.values(this.#providerPipeline)) {
            typeof provider.init === 'function' && await provider.init(/** @type {import('../interfaces.js').MonsterManager} */ (/** @type {unknown} */ (mm)));
        }
    }

    /**
     * Gets the array of configured translation providers.
     * @returns {TranslationProvider[]} The provider pipeline.
     */
    get providers() {
        return this.#providerPipeline;
    }

    /**
     * Gets a provider by ID (case-insensitive).
     * @param {string} id - Provider identifier.
     * @returns {TranslationProvider} The translation provider.
     * @throws {Error} If the provider is not found.
     */
    getProvider(id) {
        const provider = this.#providerMap.get(id.toLowerCase());
        if (!provider) {
            throw new Error(`Provider with id ${id} not found`);
        }
        return provider;
    }

    /**
     * Creates jobs by distributing TUs to providers in the pipeline.
     * Each provider accepts TUs it can handle, passing remaining TUs to the next provider.
     * @param {import('../interfaces.js').JobRequest} job - The initial job request with TUs to distribute.
     * @param {CreateJobsOptions} [options] - Job creation options.
     * @returns {Promise<Job[]>} Array of created jobs, one per provider that accepted TUs.
     */
    async createJobs(job, options = {}) {
        const {
            providerList,
            ...providerOptions
        } = options;

        /** @type {Job[]} */
        const jobs = [];
        const pipeline = providerList ? providerList.map(id => this.getProvider(id)) : this.#providerPipeline;
        let providerIdx = 0;
        while (job.tus.length > 0 && providerIdx < pipeline.length) {
            const provider = pipeline[providerIdx];
            const createdJob = await provider.create(/** @type {import('../interfaces.js').JobRequest} */ (job), providerOptions);
            if (createdJob.tus.length > 0) {
                jobs.push({ ...createdJob, translationProvider: provider.id });
                const acceptedGuids = new Set(createdJob.tus.map(tu => tu.guid));
                job.tus = job.tus.filter(tu => !acceptedGuids.has(tu.guid));
            }
            providerIdx++;
        }
        job.tus.length > 0 && jobs.push(/** @type {Job} */ (/** @type {unknown} */ (job)));
        return jobs;
    }

    /**
     * Starts a batch of created jobs, sending them to their assigned providers.
     * @param {Job[]} jobs - Array of jobs to start.
     * @param {StartJobsOptions} options - Start options.
     * @returns {Promise<StartedJobSummary[]>} Array of started job summaries.
     */
    async startJobs(jobs, options) {
        const startedJobs = [];
        for (const job of jobs) {
            job.jobGuid = await this.#tmm.generateJobGuid();
            options.jobName && (job.jobName = options.jobName);
            options.instructions && (job.instructions = options.instructions);
            const provider = this.getProvider(job.translationProvider);
            logInfo`Starting job ${job.jobGuid} with provider ${job.translationProvider}...`;
            const jobResponse = { ...await provider.start(job) };
            const blockIterator = this.#processJob(provider, jobResponse, job);
            blockIterator && await this.#tmm.getTM(job.sourceLang, job.targetLang).saveTmBlock(blockIterator);
            const { sourceLang, targetLang, jobGuid, translationProvider, status, statusDescription } = jobResponse;
            startedJobs.push({ sourceLang, targetLang, jobGuid, translationProvider, status, statusDescription });
        }
        return startedJobs;
    }

    /**
     * Updates a pending job by continuing its provider's async operation.
     * @param {string} jobGuid - Job identifier to update.
     * @returns {Promise<Job>} The updated job response.
     * @throws {Error} If the job is not in pending status.
     */
    async updateJob(jobGuid) {
        const pendingJob = await this.#tmm.getJob(jobGuid);
        if (pendingJob.status === 'pending') {
            logInfo`Updating job ${jobGuid}...`;
            const provider = this.getProvider(pendingJob.translationProvider);
            const jobResponse = await provider.continue(pendingJob);
            if (jobResponse) {
                const blockIterator = this.#processJob(provider, jobResponse, pendingJob);
                blockIterator && await this.#tmm.getTM(pendingJob.sourceLang, pendingJob.targetLang).saveTmBlock(blockIterator);
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
