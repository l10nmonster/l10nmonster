/* eslint-disable complexity */
import { getRegressionMode, logVerbose, logWarn } from '../../l10nContext.js';
import * as utils from '../utils.js';
import * as opsManager from '../../opsManager/index.js';

/**
 * @typedef {import('../../interfaces.js').TranslationProvider} TranslationProvider
 * @typedef {import('../../interfaces.js').Job} Job
 * @typedef {import('../../interfaces.js').TU} TU
 * @typedef {import('../../interfaces.js').StatusProperties} StatusProperties
 * @typedef {import('../../interfaces.js').MonsterManager} MonsterManager
 */

/**
 * Configuration options for initializing a BaseTranslationProvider.
 * @typedef {Object} BaseTranslationProviderOptions
 * @property {string} [id] - Global identifier for the provider. Optional.
 * @property {number} [quality] - The quality of translations provided by the provider. Optional.
 * @property {Record<string, string[]>} [supportedPairs] - Supported pairs for the provider. Optional. (e.g., { "en-US": ["de-DE", "es-ES"] })
 * @property {string} [translationGroup] - If defined, only accept jobs with the same "group" property. Optional.
 * @property {string[] | string} [translationGroups] - If defined, only accept jobs with a "group" property matching one of these values. Can be an array or a comma-separated string. Optional.
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
 * @implements {TranslationProvider}
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
        if (translationGroups !== undefined) {
            if (typeof translationGroups === 'string') {
                translationGroups = translationGroups.split(',').map(g => g.trim()).filter(Boolean);
            }
            if (!Array.isArray(translationGroups) || translationGroups.length === 0) {
                throw new Error('translationGroups must be a non-empty array or comma-separated string');
            }
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

        /** @type {StatusProperties} */
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

    /**
     * Creates a job from a job request.
     * @param {Job} job - Job request to process.
     * @param {{ skipQualityCheck?: boolean, skipGroupCheck?: boolean }} [options] - Optional creation options.
     * @returns {Promise<Job>} Created job with status and metadata.
     */
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

    /**
     * Starts a created job (execute translation).
     * @param {Job} job - Job to start.
     * @returns {Promise<Job>} Job with updated status and translations.
     */
    async start(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties || !statusProperties.actions.includes('start')) {
            throw new Error(`Cannot start jobs that are in the "${job.status}" state`);
        }

        /** @type {Job} */
        let jobResponse = { ...job, status: /** @type {const} */ ('done'), statusDescription: this.statusProperties.done.description }; // return a shallow copy to be used as a response
        if (this.getTranslatedTus !== BaseTranslationProvider.prototype.getTranslatedTus) {
            logVerbose`${this.id} provider translating job ${job.jobGuid} using getTranslatedTus() method`;
            jobResponse.tus = await this.getTranslatedTus(job);
        } else if (this.createTask !== BaseTranslationProvider.prototype.createTask) {
            const task = this.createTask(jobResponse);
            logVerbose`${this.id} provider translating job ${job.jobGuid} using task ${task.taskName}`;
            try {
                jobResponse = /** @type {Job} */ (await task.execute(this.#executeOptions));
            } catch (e) {
                if (this.mm.saveFailedJobs) {
                    logWarn`Unable to start job ${job.jobGuid}: ${e.message}`;
                    jobResponse.inflight = jobResponse.tus.map(tu => tu.guid);
                    jobResponse.tus = undefined;
                    jobResponse.status = /** @type {const} */ ('pending');
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
        jobResponse.tus?.length === 0 && (jobResponse.status = /** @type {const} */ ('cancelled'));
        return jobResponse;
    }

    /**
     * Continues a pending job (for async providers).
     * @param {Job} job - Job to continue.
     * @returns {Promise<Job>} Job with updated status.
     */
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
                return /** @type {Job} */ (await task.execute(this.#executeOptions)); // TODO: de we want to dedupe here? (but latest TM entry might be the same pending one in the job response)
            } catch (e) {
                logWarn`Unable to continue job ${job.jobGuid}: ${e.message}`;
            }
        }
        return job;
    }

    /**
     * Gets provider information.
     * @returns {Promise<{ id: string, type: string, quality?: number, supportedPairs?: Record<string, string[]>, costPerWord?: number, costPerMChar?: number, description: string[] }>} Provider metadata.
     */
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

    /**
     * Initializes the provider with MonsterManager.
     * @param {MonsterManager} mm - MonsterManager instance.
     * @returns {Promise<void>}
     */
    async init(mm) {
        this.mm = mm;
    }

    // The following methods are meant to be overridden (if applicable)

    /**
     * Get the list of TUs accepted by the provider.
     * Override this method to filter which TUs to accept.
     * @param {Job} job - The job request.
     * @returns {Promise<TU[]>} A promise resolving to an array of accepted TUs.
     */
    // eslint-disable-next-line no-unused-vars
    async getAcceptedTus(job) {
        throw new Error('Not implemented');
    }

    /**
     * Get the translated TUs.
     * Override this method for synchronous translation.
     * @param {Job} job - The job request.
     * @returns {Promise<TU[]>} The array of translated TUs.
     */
    // eslint-disable-next-line no-unused-vars
    async getTranslatedTus(job) {
        throw new Error('Not implemented');
    }

    /**
     * Creates a task that when executed will return the job response.
     * Override this method for async/resumable translation.
     * @param {Job} job - The job request.
     * @returns {import('../../opsManager/task.js').default} The task to execute.
     */
    // eslint-disable-next-line no-unused-vars
    createTask(job) {
        throw new Error('Not implemented');
    }
}
