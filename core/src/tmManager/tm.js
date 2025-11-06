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

    async getUntranslatedContent(channelId, limit = 5000) {
        return await this.#tuDAL.getUntranslatedContent(this.#DAL.channel(channelId), limit);
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

    async deleteOverRank(dryrun, maxRank) {
        return await this.#tuDAL.deleteOverRank(dryrun, maxRank);
    }

    async deleteByQuality(dryrun, quality) {
        return await this.#tuDAL.deleteByQuality(dryrun, quality);
    }

    async getQualityDistribution() {
        return await this.#tuDAL.getQualityDistribution();
    }
}
