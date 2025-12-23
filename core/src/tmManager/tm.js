import { utils } from '../helpers/index.js';
import { groupObjectsByNestedProps } from '../sharedFunctions.js';

/**
 * @typedef {import('../interfaces.js').TU} TU
 * @typedef {import('../interfaces.js').NormalizedString} NormalizedString
 * @typedef {import('../interfaces.js').DALManager} DALManager
 */

/**
 * Translation statistics for a language pair.
 * @typedef {Object} TMStats
 * @property {number} tuCount - Total translation units.
 * @property {number} jobCount - Total jobs.
 */

/**
 * Query conditions for TM lookup.
 * @typedef {Object} LookupConditions
 * @property {string} [guid] - Filter by GUID.
 * @property {string} [jobGuid] - Filter by job GUID.
 * @property {string} [rid] - Filter by resource ID.
 * @property {string} [sid] - Filter by segment ID.
 * @property {string} [src] - Filter by source text (exact).
 * @property {string} [tgt] - Filter by target text (exact).
 * @property {string} [translationProvider] - Filter by provider ID.
 * @property {number} [minQ] - Minimum quality score.
 * @property {number} [maxQ] - Maximum quality score.
 */

/**
 * Translation Memory interface for a specific language pair.
 * Provides methods to query and manage translations.
 */
export class TM {
    #DAL;
    #tuDAL;

    /** @type {string} Source language code. */
    sourceLang;

    /** @type {string} Target language code. */
    targetLang;

    /**
     * Creates a new TM instance for a language pair.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @param {DALManager} DAL - Data Access Layer manager.
     */
    constructor(sourceLang, targetLang, DAL) {
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.#DAL = DAL;
        this.#tuDAL = DAL.tu(sourceLang, targetLang);
    }

    /**
     * Gets TU entries by their GUIDs.
     * @param {string[]} guids - Array of TU GUIDs.
     * @returns {Promise<Record<string, TU>>} Map of GUID to TU entry.
     */
    async getEntries(guids) {
        return this.#tuDAL.getEntries(guids);
    }

    /**
     * Gets all TU entries for a job.
     * @param {string} jobGuid - Job identifier.
     * @returns {Promise<TU[]>} Array of TU entries.
     */
    async getEntriesByJobGuid(jobGuid) {
        return await this.#tuDAL.getEntriesByJobGuid(jobGuid);
    }

    /**
     * Finds TU entries with exact matching normalized source.
     * Filters to only return entries with compatible placeholders.
     * @param {NormalizedString} nsrc - Normalized source to match.
     * @returns {Promise<TU[]>} Array of matching TU entries.
     */
    async getExactMatches(nsrc) {
        const tuCandidates = await this.#tuDAL.getExactMatches(nsrc);
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    /**
     * Gets statistics for this language pair.
     * @returns {Promise<TMStats>} TM statistics.
     */
    async getStats() {
        return await this.#tuDAL.getStats();
    }

    /**
     * Gets translation status for content in a channel, grouped by project.
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<Object>} Status grouped by project.
     */
    async getTranslatedContentStatus(channelId) {
        const status = await this.#tuDAL.getTranslatedContentStatus(this.#DAL.channel(channelId));
        return groupObjectsByNestedProps(status, [ 'prj' ]);
    }

    /**
     * Gets untranslated content status for a channel, grouped by project and group.
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<Object>} Status grouped by project -> group.
     */
    async getUntranslatedContentStatus(channelId) {
        const status = await this.#tuDAL.getUntranslatedContentStatus(this.#DAL.channel(channelId));
        return groupObjectsByNestedProps(status, [ 'prj', 'group' ]);
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

    /**
     * Queries source segments matching a WHERE condition.
     * @param {string} channelId - Channel identifier.
     * @param {string} whereCondition - SQL WHERE clause.
     * @returns {Promise<Object[]>} Array of matching source segments.
     */
    async querySource(channelId, whereCondition) {
        return await this.#tuDAL.querySource(this.#DAL.channel(channelId), whereCondition);
    }

    /**
     * Queries TUs by GUIDs, optionally filtered by channel.
     * @param {string[]} guids - Array of TU GUIDs.
     * @param {string} [channelId] - Optional channel filter.
     * @returns {Promise<TU[]>} Array of TU entries.
     */
    async queryByGuids(guids, channelId) {
        return await this.#tuDAL.queryByGuids(guids, channelId && this.#DAL.channel(channelId));
    }

    /**
     * Searches TUs with LIKE conditions and pagination.
     * @param {number} offset - Pagination offset.
     * @param {number} limit - Maximum results.
     * @param {import('../interfaces.js').TuSearchParams} [likeConditions] - Search filter options.
     * @returns {Promise<Object[]>} Array of matching translation units.
     */
    async search(offset, limit, likeConditions = {}) {
        return await this.#tuDAL.search(offset, limit, likeConditions);
    }

    /**
     * Looks up TUs matching exact conditions.
     * @param {LookupConditions} [conditions] - Exact match conditions.
     * @returns {Promise<TU[]>} Array of matching TU entries.
     */
    async lookup(conditions = {}) {
        return await this.#tuDAL.lookup(conditions);
    }

    /**
     * Gets available filter options for low-cardinality columns.
     * @returns {Promise<Object>} Available filter values per column.
     */
    async getLowCardinalityColumns() {
        return await this.#tuDAL.getLowCardinalityColumns();
    }

    /**
     * Deletes jobs that have no translation units.
     * @param {boolean} [dryrun] - If true, only return count without deleting.
     * @returns {Promise<number>} Number of deleted jobs (or count if dryrun).
     */
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

    /**
     * Gets the distribution of TUs by quality score.
     * @returns {Promise<Array<{ q: number, count: number }>>} Array of quality/count pairs.
     */
    async getQualityDistribution() {
        return await this.#tuDAL.getQualityDistribution();
    }
}
