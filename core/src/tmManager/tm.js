import { L10nContext, utils } from '@l10nmonster/core';

export class TM {
    #tuDAL;
    #jobDAL;

    constructor(sourceLang, targetLang, dal) {
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.#tuDAL = dal.tu(sourceLang, targetLang);
        this.#jobDAL = dal.job;
    }

    get guids() {
        return this.#tuDAL.getGuids();
    }

    getEntryByGuid(guid) {
        return this.#tuDAL.getEntry(guid);
    }

    getEntriesByJobGuid(jobGuid) {
        return this.#tuDAL.getEntriesByJobGuid(jobGuid);
    }

    getJobByGuid(jobGuid) {
        return {
            jobProps: this.#jobDAL.getJob(jobGuid),
            tus: this.#tuDAL.getEntriesByJobGuid(jobGuid),
        };
    }

    *getJobsByGuids(jobGuids) {
        for (const jobGuid of jobGuids) {
            yield this.getJobByGuid(jobGuid);
        }
    }

    *getAllJobs() {
        const allJobs = this.#jobDAL.getJobStatusByLangPair(this.sourceLang, this.targetLang).map(e => e[0]);
        for (const jobGuid of allJobs) {
            yield this.getJobByGuid(jobGuid);
        }
    }

    setEntry(tu) {
        try {
            this.#tuDAL.setEntry(tu);
        } catch (e) {
            L10nContext.logger.verbose(`Not setting TM entry (guid=${tu.guid}): ${e}`);
        }
    }

    deleteEntriesByJobGuid(jobGuid) {
        this.#tuDAL.deleteEntriesByJobGuid(jobGuid);
    }

    getExactMatches(nsrc) {
        const tuCandidates = this.#tuDAL.getExactMatches(nsrc);
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    getStats() {
        return this.#tuDAL.getStats();
    }

    getActiveContentTranslationStatus(channelId, prj) {
        return this.#tuDAL.getActiveContentTranslationStatus(this.sourceLang, this.targetLang, channelId, prj);
    }

    getUntranslatedContent() {
        return this.#tuDAL.getUntranslatedContent(this.sourceLang, this.targetLang);
    }
}
