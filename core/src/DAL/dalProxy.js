import { createRequest } from './messageProtocol.js';

/**
 * @typedef {import('node:worker_threads').Worker} Worker
 * @typedef {import('./workerManager.js').WorkerManager} WorkerManager
 */

/**
 * Proxy class for TuDAL that forwards method calls to a worker.
 * Implements the same interface as TuDAL but communicates via message passing.
 */
export class TuDALProxy {
    #workerManager;
    #shardIndex;
    #sourceLang;
    #targetLang;

    /**
     * @param {WorkerManager} workerManager
     * @param {number} shardIndex
     * @param {string} sourceLang
     * @param {string} targetLang
     */
    constructor(workerManager, shardIndex, sourceLang, targetLang) {
        this.#workerManager = workerManager;
        this.#shardIndex = shardIndex;
        this.#sourceLang = sourceLang;
        this.#targetLang = targetLang;
    }

    get sourceLang() {
 return this.#sourceLang; 
}

    get targetLang() {
 return this.#targetLang; 
}

    /**
     * Send a request to the worker and wait for a response.
     * @param {string} method
     * @param {any[]} args
     * @returns {Promise<any>}
     */
    async #call(method, args) {
        const worker = await this.#workerManager.getTmWorker(this.#shardIndex);
        const request = createRequest(method, args, {
            type: 'TuDAL',
            sourceLang: this.#sourceLang,
            targetLang: this.#targetLang,
        });
        return this.#workerManager.sendRequest(worker, request);
    }

    // ========== TU Methods ==========

    async getEntries(guids) {
        return this.#call('getEntries', [guids]);
    }

    async getEntriesByJobGuid(jobGuid) {
        return this.#call('getEntriesByJobGuid', [jobGuid]);
    }

    async saveJobs(jobs, options) {
        return this.#call('saveJobs', [jobs, options]);
    }

    async deleteJob(jobGuid) {
        return this.#call('deleteJob', [jobGuid]);
    }

    async getExactMatches(nsrc) {
        return this.#call('getExactMatches', [nsrc]);
    }

    async deleteEmptyJobs(dryrun) {
        return this.#call('deleteEmptyJobs', [dryrun]);
    }

    async tuKeysOverRank(maxRank) {
        return this.#call('tuKeysOverRank', [maxRank]);
    }

    async tuKeysByQuality(quality) {
        return this.#call('tuKeysByQuality', [quality]);
    }

    async deleteTuKeys(tuKeys) {
        return this.#call('deleteTuKeys', [tuKeys]);
    }

    async getStats() {
        return this.#call('getStats', []);
    }

    async getQualityDistribution() {
        return this.#call('getQualityDistribution', []);
    }

    async lookup(params) {
        return this.#call('lookup', [params]);
    }

    async getLowCardinalityColumns() {
        return this.#call('getLowCardinalityColumns', []);
    }

    async search(offset, limit, params) {
        return this.#call('search', [offset, limit, params]);
    }

    /**
     * Bootstrap mode wrapper. Executes callback then updates ranks.
     * @template T
     * @param {() => Promise<T>} callback
     * @returns {Promise<T>}
     */
    async withBootstrapMode(callback) {
        // Note: The actual bootstrap mode in TuDAL is about deferred indexing.
        // In worker mode, we just execute the callback directly.
        // The shard-level bootstrap is handled separately by WorkerManager.
        return callback();
    }

    // ========== Methods requiring ChannelDAL ==========
    // These methods use ATTACH in the worker to access source tables directly.
    // We pass channelId as a string; the worker constructs the table name.

    async getTranslatedContentStatus(channelDAL) {
        // Pass the channelId; worker uses ATTACH to access source.segments_{channelId}
        const channelId = typeof channelDAL === 'string' ? channelDAL : channelDAL.channelId;
        return this.#call('getTranslatedContentStatus', [channelId]);
    }

    async getUntranslatedContentStatus(channelDAL) {
        const channelId = typeof channelDAL === 'string' ? channelDAL : channelDAL.channelId;
        return this.#call('getUntranslatedContentStatus', [channelId]);
    }

    async getUntranslatedContent(channelDAL, options) {
        const channelId = typeof channelDAL === 'string' ? channelDAL : channelDAL.channelId;
        return this.#call('getUntranslatedContent', [channelId, options]);
    }

    async querySource(channelDAL, whereCondition) {
        const channelId = typeof channelDAL === 'string' ? channelDAL : channelDAL.channelId;
        return this.#call('querySource', [channelId, whereCondition]);
    }

    async queryByGuids(guids, channelDAL) {
        const channelId = channelDAL ? (typeof channelDAL === 'string' ? channelDAL : channelDAL.channelId) : null;
        return this.#call('queryByGuids', [guids, channelId]);
    }

    // ========== Job Methods ==========

    async getJobTOC() {
        return this.#call('getJobTOC', []);
    }

    async getJob(jobGuid) {
        return this.#call('getJob', [jobGuid]);
    }

    async getJobCount() {
        return this.#call('getJobCount', []);
    }

    async getJobStats() {
        return this.#call('getJobStats', []);
    }

    async setJobTmStore(jobGuid, tmStoreId) {
        return this.#call('setJobTmStore', [jobGuid, tmStoreId]);
    }

    async getJobDeltas(toc, storeId) {
        return this.#call('getJobDeltas', [toc, storeId]);
    }

    async getValidJobIds(toc, blockId, storeId) {
        return this.#call('getValidJobIds', [toc, blockId, storeId]);
    }
}
