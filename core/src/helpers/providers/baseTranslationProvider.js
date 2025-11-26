/* eslint-disable complexity */
import { getRegressionMode, logVerbose, logWarn } from '../../l10nContext.js';
import * as utils from '../utils.js';
import * as opsManager from '../../opsManager/index.js';
import { TU } from '../../entities/tu.js';

/**
 * Configuration options for initializing a BaseTranslationProvider.
 * @typedef {Object} BaseTranslationProviderOptions
 * @property {string} [id] - Global identifier for the provider. Optional.
 * @property {number} [quality] - The quality of translations provided by the provider. Optional.
 * @property {Record<string, string[]>} [supportedPairs] - Supported pairs for the provider. Optional. (e.g., { "en-US": ["de-DE", "es-ES"] })
 * @property {string} [translationGroup] - If defined, only accept jobs with the same "group" property. Optional.
 * @property {string[]} [translationGroups] - If defined, only accept jobs with a "group" property matching one of these values. Optional.
 * @property {string} [defaultInstructions] - Instructions to include automatically in job.
 * @property {number} [minWordQuota] - Minimum word quota to accept the job. Optional.
 * @property {number} [maxWordQuota] - Maximum word quota to accept the job. Optional.
 * @property {number} [costPerWord] - The estimated cost per word for the provider. Optional.
 * @property {number} [costPerMChar] - The estimated cost per million characters for the provider. Optional.
 * @property {boolean} [saveIdenticalEntries] - Save translations even if identical to TM. Optional.
 * @property {number} [parallelism] - Number of operations to run concurrently when executing tasks. Optional.
 */

/**
 * Base class for all providers providing baseline functionality.
 */
export class BaseTranslationProvider {
    defaultInstructions;
    quality;
    translationGroups;

    #id;
    costPerWord;
    costPerMChar;
    minWordQuota;
    maxWordQuota;
    saveIdenticalEntries;
    supportedPairs;
    #executeOptions;

    /**
     * Initializes a new instance of the BaseTranslationProvider class.
     * @param {BaseTranslationProviderOptions} [options] - Configuration options for the provider.
     */
    constructor({ id, quality, supportedPairs, translationGroup, translationGroups, defaultInstructions, minWordQuota, maxWordQuota, costPerWord, costPerMChar, saveIdenticalEntries, parallelism } = {}) {
        this.#id = id;
        this.quality = quality;
        if (translationGroups !== undefined && (!Array.isArray(translationGroups) || translationGroups.length === 0)) {
            throw new Error('translationGroups must be an array with at least 1 element');
        }
        this.translationGroups = translationGroups ?
            new Set(translationGroups) :
            (translationGroup ? new Set([translationGroup]) : undefined);
        this.defaultInstructions = defaultInstructions;
        this.minWordQuota = minWordQuota;
        this.maxWordQuota = maxWordQuota;
        this.supportedPairs = supportedPairs;
        this.costPerWord = costPerWord ?? 0;
        this.costPerMChar = costPerMChar ?? 0;
        this.saveIdenticalEntries = saveIdenticalEntries;
        this.#executeOptions = parallelism ? { parallelism } : {};
        
        // Define as non-enumerable properties so they are not included in the output of the info() method
        Object.defineProperty(this, 'statusProperties', {
            writable: true,
            enumerable: false,
            configurable: true,
        });
        this.statusProperties = {
            'created': {
                actions: [ 'start' ],
                description: 'Job ready to be started',
            },
            'pending': {
                actions: [ 'continue' ],
                description: 'Job pending completion',
            },
            'done': {
                actions: [],
                description: 'Job completed',
            },
            'cancelled': {
                actions: [],
                description: 'Job cancelled',
            },
        };
        Object.defineProperty(this, 'mm', {
            writable: true,
            enumerable: false,
            configurable: true,
            value: undefined
        });
    }

    get id() {
        return this.#id ?? this.constructor.name;
    }

    async create(job, options = {}) {
        const {
            skipQualityCheck = false,
            skipGroupCheck = false,
        } = options;
        if (job.status) {
            throw new Error(`Cannot create job as it's already in "${job.status}" state`);
        }
        // by default take any job in the supported pairs and above the minimum quality
        let acceptedTus = [];
        if (!this.supportedPairs || this.supportedPairs[job.sourceLang]?.includes(job.targetLang)) {
            if (skipQualityCheck || !this.quality) {
                acceptedTus = job.tus;
            } else {
                acceptedTus = job.tus.filter(tu => tu.minQ <= this.quality);
                if (job.tus.length !== acceptedTus.length) {
                    logVerbose`Provider ${this.id} rejected ${job.tus.length - acceptedTus.length} out of ${job.tus.length} TUs because minimum quality was not met`;
                }
            }
        } else {
            logVerbose`Provider ${this.id} rejected job because the language pair is not supported`;
        }
        if (!skipGroupCheck && this.translationGroups && acceptedTus.length > 0) {
            const initialLength = acceptedTus.length;
            acceptedTus = acceptedTus.filter(tu => this.translationGroups.has(tu.group));
            if (acceptedTus.length !== initialLength) {
                logVerbose`Provider ${this.id} rejected ${initialLength - acceptedTus.length} out of ${initialLength} TUs because translation groups did not match`;
            }
        }
        if (acceptedTus.length > 0 && this.getAcceptedTus !== BaseTranslationProvider.prototype.getAcceptedTus) {
            logVerbose`${this.id} provider creating job using getAcceptedTus() method`;
            acceptedTus = await this.getAcceptedTus({ ...job, tus: acceptedTus });
        }
        const totalWords = acceptedTus.reduce((total, tu) => total + (tu.words ?? 0), 0);
        if (this.minWordQuota !== undefined && acceptedTus.length > 0 && totalWords < this.minWordQuota) {
            logVerbose`${this.id} provider rejected job because it has too few words (${totalWords} < ${this.minWordQuota})`;
            acceptedTus = [];
        }
        if (this.maxWordQuota !== undefined && acceptedTus.length > 0 && totalWords > this.maxWordQuota) {
            logVerbose`${this.id} provider rejected job because it has too many words (${totalWords} > ${this.maxWordQuota})`;
            acceptedTus = [];
        }
        const estimatedCost = acceptedTus.reduce((total, tu) => total + (tu.words ?? 0) * this.costPerWord + ((tu.chars ?? 0) / 1000000) * this.costPerMChar, 0);
        if (acceptedTus.length > 0) {
            logVerbose`${this.id} provider accepted ${acceptedTus.length} TUs (words: ${totalWords}, cost: ${estimatedCost})`;
        }
        const status = acceptedTus.length > 0 ? 'created' : 'cancelled';
        job.statusDescription ??= this.statusProperties[status]?.description;
        return { ...job, status, tus: acceptedTus, estimatedCost };
    }

    // by default providers are synchronous and they are done once they are started
    async start(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties || !statusProperties.actions.includes('start')) {
            throw new Error(`Cannot start jobs that are in the "${job.status}" state`);
        }
        let jobResponse = { ...job, status: 'done', statusDescription: this.statusProperties.done.description }; // return a shallow copy to be used as a response
        if (this.getTranslatedTus !== BaseTranslationProvider.prototype.getTranslatedTus) {
            logVerbose`${this.id} provider translating job ${job.jobGuid} using getTranslatedTus() method`;
            jobResponse.tus = await this.getTranslatedTus(job);
        } else if (this.createTask !== BaseTranslationProvider.prototype.createTask) {
            const task = this.createTask(jobResponse);
            logVerbose`${this.id} provider translating job ${job.jobGuid} using task ${task.taskName}`;
            try {
                jobResponse = await task.execute(this.#executeOptions);
            } catch (e) {
                if (this.mm.saveFailedJobs) {
                    logWarn`Unable to start job ${job.jobGuid}: ${e.message}`;
                    jobResponse.inflight = jobResponse.tus.map(tu => tu.guid);
                    jobResponse.tus = undefined;
                    jobResponse.status = 'pending';
                    jobResponse.statusDescription = this.statusProperties.pending.description;
                } else {
                    throw e;
                }
            }
            jobResponse.taskName = getRegressionMode() ? 'x' : task.taskName;
        }

        // remove translations identical to latest TM entry
        const tm = this.mm.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
        if (!this.saveIdenticalEntries && jobResponse.tus) {
            const tusToDedupe = jobResponse.tus;
            jobResponse.tus = [];
            const existingEntries = await tm.getEntries(tusToDedupe.map(tu => tu.guid));
            for (const sourceTu of tusToDedupe) {
                const existingEntry = existingEntries[sourceTu.guid];
                if (!existingEntry || (!existingEntry.inflight && !utils.normalizedStringsAreEqual(existingEntry.ntgt, sourceTu.ntgt))) {
                    jobResponse.tus.push(sourceTu);
                }
            }
        }
        jobResponse.tus?.length === 0 && (jobResponse.status = 'cancelled');
        return jobResponse;
    }

    // some providers are asynchronous and require a continuation -- just enforce status transitions in the super
    async continue(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties || !statusProperties.actions.includes('continue')) {
            throw new Error(`Cannot continue jobs that are in the "${job.status}" state`);
        }
        if (job.taskName) {
            const task = await opsManager.hydrateTaskFromStore(job.taskName);
            if (!task) {
                throw new Error(`Task ${job.taskName} not found`);
            }
            if (task.rootOp.state === 'done') {
                throw new Error(`Task ${job.taskName} is already done!`);
            }
            try {
                return await task.execute(this.#executeOptions); // TODO: de we want to dedupe here? (but latest TM entry might be the same pending one in the job response)
            } catch (e) {
                logWarn`Unable to continue job ${job.jobGuid}: ${e.message}`;
            }
        }
        return job;
    }

        // use cases:
    //   1 - both are passed as both are created at the same time -> may cancel if response is empty
    //   2 - only jobRequest is passed because it's blocked -> write if "blocked", cancel if "created"
    //   3 - only jobResponse is passed because it's pulled -> must write even if empty or it will show as blocked/pending
    processJob(jobResponse, jobRequest) {
        if (jobResponse?.status === 'cancelled') {
            return;
        }
        if (jobRequest && jobResponse) {
            if (jobResponse.status === 'created' && !(jobResponse.tus?.length > 0 || jobResponse.inflight?.length > 0)) {
                jobResponse.status = 'cancelled';
                jobResponse.statusDescription = this.statusProperties.cancelled.description;
                return;
            }
        }
        if (jobRequest && !jobResponse && jobRequest.status === 'created') {
            jobRequest.status = 'cancelled';
            jobRequest.statusDescription = this.statusProperties.cancelled.description;
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

    async info() {
        return {
            id: this.id,
            type: this.constructor.name,
            quality: this.quality,
            supportedPairs: this.supportedPairs,
            costPerWord: this.costPerWord,
            costPerMChar: this.costPerMChar,
            description: [],
        };
    }

    async init(mm) {
        this.mm = mm;
    }

    // The following methods are meant to be overridden (if applicable)

    /**
     * Get the list of tus accepted by the provider.
     *
     * @param {Record<string, any>} job - The job request.
     * @returns {Promise<any[]>} A promise resolving to an array of accepted TUs.
     */
    // eslint-disable-next-line no-unused-vars
    async getAcceptedTus(job) {
        throw new Error('Not implemented');
    }

    /**
     * Get the translated TUs.
     *
     * @param {Record<string, any>} job - The job request.
     * @returns {Promise<any[]>} The array of translated TUs.
     */
    // eslint-disable-next-line no-unused-vars
    async getTranslatedTus(job) {
        throw new Error('Not implemented');
    }

    /**
     * Creates a task than when executed will return the job response.
     *
     * @param {Record<string, any>} job - The job request.
     * @returns {Record<string, any>} The task to execute.
     */
    // eslint-disable-next-line no-unused-vars
    createTask(job) {
        throw new Error('Not implemented');
    }
}
