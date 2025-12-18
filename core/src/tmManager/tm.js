import { utils } from '../helpers/index.js';
import { groupObjectsByNestedProps } from '../sharedFunctions.js';

export class TM {
    #DAL;
    #tuDAL;

    constructor(sourceLang, targetLang, DAL) {
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.#DAL = DAL;
        this.#tuDAL = DAL.tu(sourceLang, targetLang);
    }

    async getEntries(guids) {
        return this.#tuDAL.getEntries(guids);
    }

    async getEntriesByJobGuid(jobGuid) {
        return await this.#tuDAL.getEntriesByJobGuid(jobGuid);
    }

    async getExactMatches(nsrc) {
        const tuCandidates = await this.#tuDAL.getExactMatches(nsrc);
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    async getStats() {
        return await this.#tuDAL.getStats();
    }

    async getActiveContentTranslationStatus(channelId) {
        const status = await this.#tuDAL.getActiveContentTranslationStatus(this.#DAL.channel(channelId));
        return groupObjectsByNestedProps(status, [ 'prj' ]);
    }

    /**
     * Get untranslated content from a channel.
     * @param {string} channelId - The channel ID to query.
     * @param {Object} [options] - Options for the query.
     * @param {number} [options.limit=5000] - Maximum number of segments to return.
     * @param {string[]} [options.prj] - Array of project names to filter by.
     * @returns {Promise<Object[]>} Array of untranslated translation units.
     */
    async getUntranslatedContent(channelId, { limit = 5000, prj } = {}) {
        return await this.#tuDAL.getUntranslatedContent(this.#DAL.channel(channelId), { limit, prj });
    }

    async querySource(channelId, whereCondition) {
        return await this.#tuDAL.querySource(this.#DAL.channel(channelId), whereCondition);
    }

    async queryByGuids(guids, channelId) {
        return await this.#tuDAL.queryByGuids(guids, channelId && this.#DAL.channel(channelId));
    }

    async search(offset, limit, likeConditions = {}) {
        return await this.#tuDAL.search(offset, limit, likeConditions);
    }

    async lookup(conditions = {}) {
        return await this.#tuDAL.lookup(conditions);
    }

    async getLowCardinalityColumns() {
        return await this.#tuDAL.getLowCardinalityColumns();
    }

    async deleteEmptyJobs(dryrun) {
        return await this.#tuDAL.deleteEmptyJobs(dryrun);
    }

    /**
     * Get TU keys (guid, jobGuid tuples) where rank exceeds the specified maximum.
     * @param {number} maxRank - Maximum rank threshold.
     * @returns {Promise<[string, string][]>} Array of [guid, jobGuid] tuples identifying TUs to delete.
     */
    async tuKeysOverRank(maxRank) {
        return await this.#tuDAL.tuKeysOverRank(maxRank);
    }

    /**
     * Get TU keys (guid, jobGuid tuples) with a specific quality score.
     * @param {number} quality - Quality score to match.
     * @returns {Promise<[string, string][]>} Array of [guid, jobGuid] tuples identifying TUs to delete.
     */
    async tuKeysByQuality(quality) {
        return await this.#tuDAL.tuKeysByQuality(quality);
    }

    /**
     * Delete TUs identified by their composite keys (guid, jobGuid tuples).
     * @param {[string, string][]} tuKeys - Array of [guid, jobGuid] tuples identifying TUs to delete.
     * @returns {Promise<{deletedTusCount: number, touchedJobsCount: number}>} Count of deleted TUs and touched jobs.
     */
    async deleteTuKeys(tuKeys) {
        return await this.#tuDAL.deleteTuKeys(tuKeys);
    }

    async getQualityDistribution() {
        return await this.#tuDAL.getQualityDistribution();
    }
}
