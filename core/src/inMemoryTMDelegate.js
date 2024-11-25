import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { utils } from '@l10nmonster/helpers';

export class InMemoryTMDelegate {
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
                Object.values(tmData.tus).forEach(tu => this.setEntry(tu));
            }
        }
    }

    getGuids() {
        return Object.keys(this.#tus);
    }

    getEntryByGuid(guid) {
        return this.#tus[guid];
    }

    setEntry(entry) {
        this.#tus[entry.guid] = entry;
        const flatSrc = utils.flattenNormalizedSourceToOrdinal(entry.nsrc);
        this.#lookUpByFlatSrc[flatSrc] ??= [];
        !this.#lookUpByFlatSrc[flatSrc].includes(entry) && this.#lookUpByFlatSrc[flatSrc].push(entry);
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

    updateJobStatus(jobGuid, status, updatedAt, translationProvider, units) {
        this.#jobStatus[jobGuid] = { status, updatedAt, translationProvider, units };
    }

    commit() {
        if (this.#persistTMCache) {
            l10nmonster.logger.info(`Updating ${this.#tmPathName}...`);
            const tmData = {
                jobStatus: this.#jobStatus,
                tus: this.#tus,
            };
            writeFileSync(this.#tmPathName, JSON.stringify(tmData, null, '\t'), 'utf8');
        } else {
            l10nmonster.logger.info(`Cache not persisted...`);
        }
    }
}
