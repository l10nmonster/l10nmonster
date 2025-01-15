import { L10nContext, TU, utils } from '@l10nmonster/core';
import { TUDAL } from './tuDAL.js';

export class TM {
    #dal;

    constructor(db, sourceLang, targetLang) {
        this.#dal = new TUDAL(db, `tus_${sourceLang}_${targetLang}`.replace(/[^a-zA-Z0-9_]/g, '_'));
    }

    get guids() {
        return this.#dal.getGuids();
    }

    getEntryByGuid(guid) {
        const rawEntry = this.#dal.getEntry(guid);
        return rawEntry && JSON.parse(rawEntry);
    }

    #setEntry(tu) {
        try {
            const result = this.#dal.setEntry({
                jobGuid: tu.jobGuid,
                guid: tu.guid,
                entry: JSON.stringify(tu),
                flatSrc: utils.flattenNormalizedSourceToOrdinal(tu.nsrc),
                q: tu.q,
                ts: tu.ts,
            });
            result.changes !== 1 && L10nContext.logger.info(`Expecting to change a row but changed: ${result}`);
        } catch (e) {
            L10nContext.logger.verbose(`Not setting TM entry (guid=${tu.guid}): ${e}`);
        }
    }

    deleteEntriesByJobGuid(jobGuid) {
        this.#dal.deleteEntriesByJobGuid(jobGuid);
    }

    getExactMatches(nsrc) {
        const flattenedSrc = utils.flattenNormalizedSourceToOrdinal(nsrc);
        const entries = this.#dal.getEntriesByFlatSrc(flattenedSrc);
        const tuCandidates = entries.map(str => JSON.parse(str));
        return tuCandidates.filter(tu => utils.sourceAndTargetAreCompatible(nsrc, tu.ntgt));
    }

    ingestJob(jobResponse, jobRequest) {
        const requestedUnits = jobRequest?.tus ? Object.fromEntries(jobRequest.tus.map(tu => [ tu.guid, tu])) : {};
        const { jobGuid, inflight, tus, translationProvider } = jobResponse;
        if (inflight) {
            for (const guid of inflight) {
                const reqEntry = requestedUnits[guid] ?? {};
                try {
                    this.#setEntry(TU.asPair({ ...reqEntry, q: 0, jobGuid, inflight: true, ts: 0 }));
                } catch (e) {
                    L10nContext.logger.verbose(`Problems converting in-flight entry to TU: ${e}`);
                }
            }
        }
        if (tus) {
            for (const tu of tus) {
                try {
                    this.#setEntry(TU.fromRequestResponse(requestedUnits[tu.guid], tu, { jobGuid, translationProvider }));
                } catch (e) {
                    L10nContext.logger.verbose(`Problems converting entry to TU: ${e}`);
                }
            }
        }
    }
}
