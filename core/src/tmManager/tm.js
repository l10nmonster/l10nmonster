import { logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { groupObjectsByNestedProps } from '../sharedFunctions.js';

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
        const allJobs = this.#jobDAL.getJobTOCByLangPair(this.sourceLang, this.targetLang).map(e => e.jobGuid);
        for (const jobGuid of allJobs) {
            yield this.getJobByGuid(jobGuid);
        }
    }

    setEntry(tu) {
        try {
            this.#tuDAL.setEntry(tu);
        } catch (e) {
            logVerbose`Not setting TM entry (guid=${tu.guid}): ${e}`;
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

    getActiveContentTranslationStatus() {
        const status = this.#tuDAL.getActiveContentTranslationStatus(this.sourceLang, this.targetLang);
        return groupObjectsByNestedProps(status, [ 'channel', 'prj' ]);
    }

    getUntranslatedContent() {
        return this.#tuDAL.getUntranslatedContent(this.sourceLang, this.targetLang);
    }

    querySource(whereCondition) {
        return this.#tuDAL.querySource(this.sourceLang, this.targetLang, whereCondition);
    }

    search(offset, limit, likeConditions = {}) {
        return this.#tuDAL.search(this.sourceLang, this.targetLang, offset, limit, likeConditions);
    }
}
