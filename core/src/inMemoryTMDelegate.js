import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { utils } from '@l10nmonster/helpers';

export class InMemoryTMDelegate {
    #isDirty = false;
    #tmPathName;
    #persistTMCache;
    #tus;
    #lookUpByFlatSrc = {};
    #jobStatus;

    constructor(tmBasePathName, persistTMCache, jobs) {
        this.#tmPathName = `${tmBasePathName}.json`;
        this.#persistTMCache = persistTMCache;
        this.#tus = {};
        this.#jobStatus = {};

        if (persistTMCache && existsSync(this.#tmPathName)) {
            const tmData = JSON.parse(readFileSync(this.#tmPathName, 'utf8'));
            const jobMap = Object.fromEntries(jobs);
            const extraJobs = Object.keys(tmData?.jobStatus ?? {}).filter(jobGuid => !jobMap[jobGuid]);
            // nuke the cache if jobs were removed
            if (extraJobs.length > 0) {
                this.#jobStatus = {};
                this.#tus = {};
                l10nmonster.logger.info(`Nuking existing TM ${this.#tmPathName}`);
            } else {
                this.#jobStatus = tmData.jobStatus;
                Object.values(tmData.tus).forEach(tu => this.#setEntry(tu));
            }
        }
    }

    get guids() {
        return Object.keys(this.#tus);
    }

    getEntryByGuid(guid) {
        return this.#tus[guid];
    }

    #setEntry(entry) {
        try {
            const cleanedTU = l10nmonster.TU.asPair(entry);
            this.#tus[cleanedTU.guid] = cleanedTU;
            const flatSrc = utils.flattenNormalizedSourceToOrdinal(cleanedTU.nsrc);
            this.#lookUpByFlatSrc[flatSrc] ??= [];
            !this.#lookUpByFlatSrc[flatSrc].includes(cleanedTU) && this.#lookUpByFlatSrc[flatSrc].push(cleanedTU);
        } catch (e) {
            l10nmonster.logger.verbose(`Not setting TM entry (guid=${entry.guid}): ${e}`);
        }
    }

    getAllEntriesBySrc(src) {
        const flatSrc = utils.flattenNormalizedSourceToOrdinal(src);
        return this.#lookUpByFlatSrc[flatSrc] || [];
    }

    getJobsMeta() {
        return this.#jobStatus;
    }

    getJobStatus(jobGuid) {
        const jobMeta = this.#jobStatus[jobGuid];
        return [ jobMeta?.status, jobMeta?.updatedAt ];
    }

    async processJob(jobResponse, jobRequest) {
        this.#isDirty = true;
        const requestedUnits = {};
        jobRequest?.tus && jobRequest.tus.forEach(tu => requestedUnits[tu.guid] = tu);
        const { jobGuid, status, inflight, tus, updatedAt, translationProvider } = jobResponse;
        if (inflight) {
            for (const guid of inflight) {
                const reqEntry = requestedUnits[guid] ?? {};
                const tmEntry = this.getEntryByGuid(guid);
                if (!tmEntry) {
                    this.#setEntry({ ...reqEntry, q: 0, jobGuid, inflight: true, ts: 0 });
                }
            }
        }
        if (tus) {
            for (const tu of tus) {
                const tmEntry = this.getEntryByGuid(tu.guid);
                const reqEntry = requestedUnits[tu.guid] ?? {};
                const rectifiedTU = { ...reqEntry, ...tu, jobGuid, translationProvider };
                if (!tmEntry || tmEntry.q < tu.q || (tmEntry.q === tu.q && tmEntry.ts < rectifiedTU.ts)) {
                    this.#setEntry(rectifiedTU);
                }
            }
        }
        this.#jobStatus[jobGuid] = { status, updatedAt, translationProvider, units: tus?.length ?? inflight?.length ?? 0 };
    }

    commit() {
        if (this.#isDirty && this.#persistTMCache) {
            l10nmonster.logger.info(`Updating ${this.#tmPathName}...`);
            const tmData = {
                jobStatus: this.#jobStatus,
                tus: this.#tus,
            };
            writeFileSync(this.#tmPathName, JSON.stringify(tmData, null, '\t'), 'utf8');
        }
    }
}
