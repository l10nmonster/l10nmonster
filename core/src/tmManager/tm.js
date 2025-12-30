import { logWarn } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { groupObjectsByNestedProps } from '../sharedFunctions.js';

/**
 * @typedef {import('../interfaces.js').TU} TU
 * @typedef {import('../interfaces.js').NormalizedString} NormalizedString
 * @typedef {import('../interfaces.js').DALManager} DALManager
 * @typedef {import('../interfaces.js').JobPropsTusPair} JobPropsTusPair
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

    /** @type {import('../interfaces.js').TuDAL} */
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
        const tuDAL = this.#tuDAL;
        return tuDAL.getEntries(guids);
    }

    /**
     * Gets all TU entries for a job.
     * @param {string} jobGuid - Job identifier.
     * @returns {Promise<TU[]>} Array of TU entries.
     */
    async getEntriesByJobGuid(jobGuid) {
        const tuDAL = this.#tuDAL;
        return tuDAL.getEntriesByJobGuid(jobGuid);
    }

    /**
     * Finds TU entries with exact matching normalized source.
     * Filters to only return entries with compatible placeholders.
     * @param {NormalizedString} nsrc - Normalized source to match.
     * @returns {Promise<TU[]>} Array of matching TU entries.
     */
    async getExactMatches(nsrc) {
        const tuDAL = this.#tuDAL;
        const tuCandidates = await tuDAL.getExactMatches(nsrc);
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    /**
     * Gets statistics for this language pair.
     * @returns {Promise<TMStats>} TM statistics.
     */
    async getStats() {
        const tuDAL = this.#tuDAL;
        return tuDAL.getStats();
    }

    /**
     * Gets translation status for content in a channel, grouped by project.
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<Object>} Status grouped by project.
     */
    async getTranslatedContentStatus(channelId) {
        const tuDAL = this.#tuDAL;
        const status = await tuDAL.getTranslatedContentStatus(this.#DAL.channel(channelId));
        return groupObjectsByNestedProps(status, [ 'prj' ]);
    }

    /**
     * Gets untranslated content status for a channel, grouped by project and group.
     * @param {string} channelId - Channel identifier.
     * @returns {Promise<Object>} Status grouped by project -> group.
     */
    async getUntranslatedContentStatus(channelId) {
        const tuDAL = this.#tuDAL;
        const status = await tuDAL.getUntranslatedContentStatus(this.#DAL.channel(channelId));
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
        const tuDAL = this.#tuDAL;
        return tuDAL.getUntranslatedContent(this.#DAL.channel(channelId), { limit, prj });
    }

    /**
     * Queries source segments matching a WHERE condition.
     * @param {string} channelId - Channel identifier.
     * @param {string} whereCondition - SQL WHERE clause.
     * @returns {Promise<Object[]>} Array of matching source segments.
     */
    async querySource(channelId, whereCondition) {
        const tuDAL = this.#tuDAL;
        return tuDAL.querySource(this.#DAL.channel(channelId), whereCondition);
    }

    /**
     * Queries TUs by GUIDs, optionally filtered by channel.
     * @param {string[]} guids - Array of TU GUIDs.
     * @param {string} [channelId] - Optional channel filter.
     * @returns {Promise<TU[]>} Array of TU entries.
     */
    async queryByGuids(guids, channelId) {
        const tuDAL = this.#tuDAL;
        return tuDAL.queryByGuids(guids, channelId ? this.#DAL.channel(channelId) : null);
    }

    /**
     * Searches TUs with LIKE conditions and pagination.
     * @param {number} offset - Pagination offset.
     * @param {number} limit - Maximum results.
     * @param {import('../interfaces.js').TuSearchParams} [likeConditions] - Search filter options.
     * @returns {Promise<Object[]>} Array of matching translation units.
     */
    async search(offset, limit, likeConditions = {}) {
        const tuDAL = this.#tuDAL;
        return tuDAL.search(offset, limit, likeConditions);
    }

    /**
     * Looks up TUs matching exact conditions.
     * @param {LookupConditions} [conditions] - Exact match conditions.
     * @returns {Promise<TU[]>} Array of matching TU entries.
     */
    async lookup(conditions = {}) {
        const tuDAL = this.#tuDAL;
        return tuDAL.lookup(conditions);
    }

    /**
     * Gets available filter options for low-cardinality columns.
     * @returns {Promise<Object>} Available filter values per column.
     */
    async getLowCardinalityColumns() {
        const tuDAL = this.#tuDAL;
        return tuDAL.getLowCardinalityColumns();
    }

    /**
     * Deletes jobs that have no translation units.
     * @param {boolean} [dryrun] - If true, only return count without deleting.
     * @returns {Promise<number>} Number of deleted jobs (or count if dryrun).
     */
    async deleteEmptyJobs(dryrun) {
        const tuDAL = this.#tuDAL;
        return tuDAL.deleteEmptyJobs(dryrun);
    }

    /**
     * Get TU keys (guid, jobGuid tuples) where rank exceeds the specified maximum.
     * @param {number} maxRank - Maximum rank threshold.
     * @returns {Promise<[string, string][]>} Array of [guid, jobGuid] tuples identifying TUs to delete.
     */
    async tuKeysOverRank(maxRank) {
        const tuDAL = this.#tuDAL;
        return tuDAL.tuKeysOverRank(maxRank);
    }

    /**
     * Get TU keys (guid, jobGuid tuples) with a specific quality score.
     * @param {number} quality - Quality score to match.
     * @returns {Promise<[string, string][]>} Array of [guid, jobGuid] tuples identifying TUs to delete.
     */
    async tuKeysByQuality(quality) {
        const tuDAL = this.#tuDAL;
        return tuDAL.tuKeysByQuality(quality);
    }

    /**
     * Delete TUs identified by their composite keys (guid, jobGuid tuples).
     * @param {[string, string][]} tuKeys - Array of [guid, jobGuid] tuples identifying TUs to delete.
     * @returns {Promise<{deletedTusCount: number, touchedJobsCount: number}>} Count of deleted TUs and touched jobs.
     */
    async deleteTuKeys(tuKeys) {
        const tuDAL = this.#tuDAL;
        return tuDAL.deleteTuKeys(tuKeys);
    }

    /**
     * Gets the distribution of TUs by quality score.
     * @returns {Promise<Array<{ q: number, count: number }>>} Array of quality/count pairs.
     */
    async getQualityDistribution() {
        const tuDAL = this.#tuDAL;
        return tuDAL.getQualityDistribution();
    }

    /**
     * Maximum TUs per transaction when saving TM blocks.
     * Larger values reduce transaction overhead but increase memory usage.
     */
    static MAX_TUS_PER_TRANSACTION = 50000;

    /**
     * Saves a TM block (iterator of jobs) to the database with chunked transactions.
     * Jobs are batched together until adding the next job would exceed MAX_TUS_PER_TRANSACTION.
     * @param {AsyncIterable<JobPropsTusPair>} tmBlockIterator - Iterator yielding job/TU pairs.
     * @param {Object} [options] - Options for saving the TM block.
     * @param {string} [options.tmStoreId] - TM store ID to associate with saved jobs.
     * @param {boolean} [options.updateRank=true] - Whether to update TU ranks after saving.
     * @returns {Promise<{jobs: Object[], tuCount: number}>} Saved job properties and total TU count.
     */
    async saveTmBlock(tmBlockIterator, { tmStoreId, updateRank = true } = {}) {
        const tuDAL = this.#tuDAL;
        const jobs = [];
        let jobBatch = [];
        let batchTuCount = 0;
        let totalTuCount = 0;

        for await (const job of tmBlockIterator) {
            if (!job) {
                logWarn`Received a nullish job while saving a TM block`;
                continue;
            }

            const { jobProps, tus } = job;
            if (!tus?.length) {
                logWarn`Ignoring empty job ${jobProps.jobGuid}`;
                continue;
            }

            const jobTuCount = tus.length;

            // If adding this job would exceed limit AND we have jobs, flush first
            if (batchTuCount + jobTuCount > TM.MAX_TUS_PER_TRANSACTION && jobBatch.length > 0) {
                await tuDAL.saveJobs(jobBatch, { tmStoreId, updateRank });
                jobs.push(...jobBatch.map(j => j.jobProps));
                totalTuCount += batchTuCount;
                jobBatch = [];
                batchTuCount = 0;
            }

            jobBatch.push({ jobProps, tus });
            batchTuCount += jobTuCount;
        }

        // Flush remaining batch
        if (jobBatch.length > 0) {
            await tuDAL.saveJobs(jobBatch, { tmStoreId, updateRank });
            jobs.push(...jobBatch.map(j => j.jobProps));
            totalTuCount += batchTuCount;
        }

        return { jobs, tuCount: totalTuCount };
    }

    /**
     * Bootstraps this language pair with bulk data from a job iterator.
     * This is a destructive operation - the TM database should be wiped before calling.
     * Jobs are batched by TU count to keep transaction sizes manageable.
     * @param {AsyncIterable<JobPropsTusPair>} jobIterator - Iterator yielding job/TU pairs.
     * @param {string} tmStoreId - TM store ID to associate with saved jobs.
     * @returns {Promise<{jobCount: number, tuCount: number}>} Statistics about loaded data.
     */
    async bootstrap(jobIterator, tmStoreId) {
        const tuDAL = this.#tuDAL;
        return tuDAL.withBootstrapMode(async () => {
            const { jobs, tuCount } = await this.saveTmBlock(jobIterator, { tmStoreId, updateRank: false });
            return { jobCount: jobs.length, tuCount };
        });
    }
}
