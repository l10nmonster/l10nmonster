import { L10nContext, utils } from '@l10nmonster/core';
import { TuDAL } from './tuDAL.js';

export class TM {
    #tuDal;
    #jobDAL;

    constructor(sourceLang, targetLang, db, jobDAL) {
        this.sourceLang = sourceLang;
        this.targetLang = targetLang;
        this.#tuDal = new TuDAL(db, `tus_${sourceLang}_${targetLang}`.replace(/[^a-zA-Z0-9_]/g, '_'));
        this.#jobDAL = jobDAL;
    }

    get guids() {
        return this.#tuDal.getGuids();
    }

    getEntryByGuid(guid) {
        return this.#tuDal.getEntry(guid);
    }

    getEntriesByJobGuid(jobGuid) {
        return this.#tuDal.getEntriesByJobGuid(jobGuid);
    }

    getJobByGuid(jobGuid) {
        return {
            jobProps: this.#jobDAL.getJob(jobGuid),
            tus: this.#tuDal.getEntriesByJobGuid(jobGuid),
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
            this.#tuDal.setEntry(tu);
        } catch (e) {
            L10nContext.logger.verbose(`Not setting TM entry (guid=${tu.guid}): ${e}`);
        }
    }

    deleteEntriesByJobGuid(jobGuid) {
        this.#tuDal.deleteEntriesByJobGuid(jobGuid);
    }

    getExactMatches(nsrc) {
        const tuCandidates = this.#tuDal.getExactMatches(nsrc);
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    getStats() {
        return this.#tuDal.getStats();
    }
}
