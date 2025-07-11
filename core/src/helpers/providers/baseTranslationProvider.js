import { getRegressionMode, logVerbose, logWarn } from '../../l10nContext.js';
import * as utils from '../utils.js';
import * as opsManager from '../../opsManager/index.js';

/**
 * Configuration options for initializing a BaseTranslationProvider.
 * @typedef {Object} BaseTranslationProviderOptions
 * @property {string} [id] - Global identifier for the provider. Optional.
 * @property {number} [quality] - The quality of translations provided by the provider. Optional.
 * @property {Record<string, string[]>} [supportedPairs] - Supported pairs for the provider. Optional. (e.g., { "en-US": ["de-DE", "es-ES"] })
 * @property {string} [translationGroup] - If defined, only accept jobs with the same "group" property. Optional.
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
    translationGroup;
    statusProperties = {
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
    mm;

    #id;
    #costPerWord;
    #costPerMChar;
    #minWordQuota;
    #maxWordQuota;
    #saveIdenticalEntries;
    #supportedPairs;
    #executeOptions;

    /**
     * Initializes a new instance of the BaseTranslationProvider class.
     * @param {BaseTranslationProviderOptions} [options] - Configuration options for the provider.
     */
    constructor({ id, quality, supportedPairs, translationGroup, defaultInstructions, minWordQuota, maxWordQuota, costPerWord, costPerMChar, saveIdenticalEntries, parallelism } = {}) {
        this.#id = id;
        this.quality = quality;
        this.translationGroup = translationGroup;
        this.defaultInstructions = defaultInstructions;
        this.#minWordQuota = minWordQuota;
        this.#maxWordQuota = maxWordQuota;
        this.#supportedPairs = supportedPairs;
        this.#costPerWord = costPerWord ?? 0;
        this.#costPerMChar = costPerMChar ?? 0;
        this.#saveIdenticalEntries = saveIdenticalEntries;
        this.#executeOptions = parallelism ? { parallelism } : {};
    }

    get id() {
        return this.#id ?? this.constructor.name;
    }

    async create(job) {
        if (job.status) {
            throw new Error(`Cannot create job as it's already in "${job.status}" state`);
        }
        // by default take any job in the supported pairs and above the minimum quality
        let acceptedTus = [];
        if (!this.#supportedPairs || this.#supportedPairs[job.sourceLang]?.includes(job.targetLang)) {
            acceptedTus = this.quality ? job.tus.filter(tu => tu.minQ <= this.quality) : job.tus;
            if (job.tus.length !== acceptedTus.length) {
                logVerbose`Provider ${this.id} rejected ${job.tus.length - acceptedTus.length} out of ${job.tus.length} TUs because minimum quality was not met`;
            }
        } else {
            logVerbose`Provider ${this.id} rejected job because the language pair is not supported`;
        }
        if (this.translationGroup && acceptedTus.length > 0) {
            const initialLength = acceptedTus.length;
            acceptedTus = acceptedTus.filter(tu => tu.group === this.translationGroup);
            if (acceptedTus.length !== initialLength) {
                logVerbose`Provider ${this.id} rejected ${initialLength - acceptedTus.length} out of ${initialLength} TUs because translation groups did not match`;
            }
        }
        if (acceptedTus.length > 0 && this.getAcceptedTus !== BaseTranslationProvider.prototype.getAcceptedTus) {
            logVerbose`${this.id} provider creating job using getAcceptedTus() method`;
            acceptedTus = await this.getAcceptedTus({ ...job, tus: acceptedTus });
        }
        const totalWords = acceptedTus.reduce((total, tu) => total + (tu.words ?? 0), 0);
        if (this.#minWordQuota !== undefined && acceptedTus.length > 0 && totalWords < this.#minWordQuota) {
            logVerbose`${this.id} provider rejected job because it has too few words (${totalWords} < ${this.#minWordQuota})`;
            acceptedTus = [];
        }
        if (this.#maxWordQuota !== undefined && acceptedTus.length > 0 && totalWords > this.#maxWordQuota) {
            logVerbose`${this.id} provider rejected job because it has too many words (${totalWords} > ${this.#maxWordQuota})`;
            acceptedTus = [];
        }
        const estimatedCost = acceptedTus.reduce((total, tu) => total + (tu.words ?? 0) * this.#costPerWord + ((tu.chars ?? 0) / 1000000) * this.#costPerMChar, 0);
        if (acceptedTus.length > 0) {
            logVerbose`${this.id} provider accepted ${acceptedTus.length} TUs (words: ${totalWords}, cost: ${estimatedCost})`;
        }
        return { ...job, status: acceptedTus.length > 0 ? 'created' : 'cancelled', tus: acceptedTus, estimatedCost };
    }

    // by default providers are synchronous and they are done once they are started
    async start(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties || !statusProperties.actions.includes('start')) {
            throw new Error(`Cannot start jobs that are in the "${job.status}" state`);
        }
        let jobResponse = { ...job, status: 'done' }; // return a shallow copy to be used as a response
        if (this.getTranslatedTus !== BaseTranslationProvider.prototype.getTranslatedTus) {
            logVerbose`${this.id} provider translating job ${job.jobGuid} using getTranslatedTus() method`;
            jobResponse.tus = this.getTranslatedTus(job);
        } else if (this.createTask !== BaseTranslationProvider.prototype.createTask) {
            const task = this.createTask(jobResponse);
            jobResponse.taskName = getRegressionMode() ? 'x' : task.taskName;
            logVerbose`${this.id} provider translating job ${job.jobGuid} using task ${task.taskName}`;
            try {
                jobResponse = await task.execute(this.#executeOptions);
            } catch (e) {
                if (this.mm.saveFailedJobs) {
                    logWarn`Unable to start job ${job.jobGuid}: ${e.message}`;
                    jobResponse.inflight = jobResponse.tus.map(tu => tu.guid);
                    jobResponse.tus = undefined;
                    jobResponse.status = 'pending';
                } else {
                    throw e;
                }
            }
        }

        // remove translations identical to latest TM entry
        const tm = this.mm.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
        if (!this.#saveIdenticalEntries && jobResponse.tus) {
            const tusToDedupe = jobResponse.tus;
            jobResponse.tus = [];
            for (const sourceTu of tusToDedupe) {
                const existingEntry = tm.getEntryByGuid(sourceTu.guid);
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

    describe(job) {
        const statusProperties = this.statusProperties[job.status];
        if (!statusProperties) {
            throw new Error(`Cannot describe job ${job.jobGuid} in unsupported "${job.status}" state`);
        }
        return statusProperties;
    }

    async info() {
        return {
            id: this.id,
            type: this.constructor.name,
            quality: this.quality,
            supportedPairs: this.#supportedPairs,
            costPerWord: this.#costPerWord,
            costPerMChar: this.#costPerMChar,
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
    async getAcceptedTus(job) {
        throw new Error('Not implemented');
    }

    /**
     * Get the translated TUs.
     *
     * @param {Record<string, any>} job - The job request.
     * @returns {any[]} The array of translated TUs.
     */
    getTranslatedTus(job) {
        throw new Error('Not implemented');
    }

    /**
     * Creates a task than when executed will return the job response.
     *
     * @param {Record<string, any>} job - The job request.
     * @returns {Record<string, any>} The task to execute.
     */
    createTask(job) {
        throw new Error('Not implemented');
    }
}
