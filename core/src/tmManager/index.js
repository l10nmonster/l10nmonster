import { nanoid } from 'nanoid';

import { L10nContext, logInfo, TU, utils } from '@l10nmonster/core';
import { TM } from './tm.js';


export default class TMManager {
    #DAL;
    #tmCache = new Map();

    constructor(dal) {
        this.#DAL = dal;
    }

    // eslint-disable-next-line no-unused-vars
    async init(mm) {
        logInfo`TMManager initialized`;
    }

    generateJobGuid() {
        if (L10nContext.regression) {
            const jobCount = this.#DAL.job.getJobCount();
            return `xxx${jobCount}xxx`;
        } else {
            return nanoid();
        }
    }

    async saveTmBlock(tmBlockIterator) {
        const jobs = [];
        const insertJob = this.#DAL.tmTransaction(job => {
            const { jobProps, tus } = job;
            this.#DAL.job.setJob(jobProps);
            jobs.push(jobProps);
            const tm = this.getTM(jobProps.sourceLang, jobProps.targetLang);
            tm.deleteEntriesByJobGuid(jobProps.jobGuid);
            tus.forEach((tu, tuOrder) => tm.setEntry({
                ...tu,
                jobGuid: jobProps.jobGuid,
                tuOrder,
            }));
        });
        for await (const job of tmBlockIterator) {
            insertJob(job);
        }
        return jobs;
    }

    async #deleteJobContents(jobGuid) {
        const job = this.#DAL.job.getJob(jobGuid);
        const tm = this.getTM(job.sourceLang, job.targetLang);
        tm.deleteEntriesByJobGuid(jobGuid);
        this.#DAL.job.deleteJob(jobGuid);
    }

    getTM(sourceLang, targetLang) {
        const key = `${sourceLang}#${targetLang}`;
        if (this.#tmCache.has(key)) {
            return this.#tmCache.get(key);
        } else {
            const tm = new TM(sourceLang, targetLang, this.#DAL);
            this.#tmCache.set(key, tm);
            return tm;
        }
    }

    // const TOC = {
    //         v: 1,
    //         blocks: {
    //             'sl=en/tl=en-GB/tp=BritishTranslator/FvJK4zYuGNYlid2DykHfB.jsonl': {
    //                 modified: 'TS1738542028426.8364',
    //                 jobs: [
    //                     [ 'FvJK4zYuGNYlid2DykHfB', '2025-02-03T00:20:20.276Z' ],
    //                 ]
    //             }
    //         }
    // }

    async prepareSyncDown(tmStore, sourceLang, targetLang) {
        if (tmStore.access === 'writeonly') {
            throw new Error(`Cannot sync down ${tmStore.id} store because it is write-only!`);
        }
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const blocksToStore = Array.from(new Set(deltas.filter(e => e.remoteJobGuid).map(e => e.blockId))); // either because they changed or because some jobs don't exist locally
        let jobsToDelete = deltas.filter(e => e.localJobGuid && !e.remoteJobGuid).map(e => e.localJobGuid);
        return {
            sourceLang,
            targetLang,
            blocksToStore,
            jobsToDelete,
        };
    }

    async syncDown(tmStore, { sourceLang, targetLang, blocksToStore, jobsToDelete }) {
        if (blocksToStore.length === 0 && jobsToDelete.length === 0) {
            logInfo`Nothing to sync up with store ${tmStore.id}`;
            return;
        }
        if (blocksToStore.length > 0) {
            logInfo`Storing ${blocksToStore.length} ${[blocksToStore.length, 'block', 'blocks']} from ${tmStore.id}`;
            await this.saveTmBlock(tmStore.getTmBlocks(sourceLang, targetLang, blocksToStore));
        }
        if (jobsToDelete.length > 0) {
            logInfo`Deleting ${jobsToDelete.length} ${[jobsToDelete.length, 'job', 'jobs']}`;
            for (const jobGuid of jobsToDelete) {
                await this.#deleteJobContents(jobGuid);
            }
        }
    }

    async prepareSyncUp(tmStore, sourceLang, targetLang, options) {
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const blockIdsToUpdate = new Set(deltas.filter(e => e.remoteJobGuid).map(e => e.blockId)); // either because they changed or because some jobs don't exist locally and need to be deleted remotely
        let jobsToUpdate = deltas.filter(e => e.localJobGuid).map(e => [ e.localJobGuid, e.localUpdatedAt ]); // this will catch changed jobs and jobs that don't exist remotely
        if (jobsToUpdate.length > 0 && options?.newerOnly) {
            const highWaterMark = Math.max(...Object.values(toc.blocks).map(blockProps => Math.max(...blockProps.jobs.map(e => new Date(e[1]).getTime()))));
            jobsToUpdate = jobsToUpdate.filter(e => new Date(e[1]).getTime() > highWaterMark);
        }
        return {
            sourceLang,
            targetLang,
            blocksToUpdate: Array.from(blockIdsToUpdate).map(blockId => [ blockId, this.#DAL.job.getValidJobIds(toc.sourceLang, toc.targetLang, toc, blockId) ]),
            jobsToUpdate: jobsToUpdate.map(e => e[0]),
        };
    }

    async syncUp(tmStore, { sourceLang, targetLang, blocksToUpdate, jobsToUpdate }) {
        if (tmStore.access === 'readonly') {
            throw new Error(`Cannot sync up ${tmStore.id} store because it is readonly!`);
        }
        if (blocksToUpdate.length === 0 && jobsToUpdate.length === 0) {
            logInfo`Nothing to sync up with store ${tmStore.id}`;
            return;
        }

        const tm = this.getTM(sourceLang, targetLang);
        await tmStore.getWriter(sourceLang, targetLang, async writeTmBlock => {
            if (blocksToUpdate.length > 0) {
                logInfo`Updating ${blocksToUpdate.length} ${[blocksToUpdate.length, 'block', 'blocks']} in ${tmStore.id}`;
                for (const [ blockId, jobs ] of blocksToUpdate) {
                    await writeTmBlock({ blockId }, tm.getJobsByGuids(jobs));
                }
            }
            if (jobsToUpdate.length > 0) {
                logInfo`Syncing ${jobsToUpdate.length} ${[jobsToUpdate.length, 'job', 'jobs']} to ${tmStore.id}`;
                if (tmStore.partitioning === 'job') {
                    for (const jobGuid of jobsToUpdate) {
                        const job = this.#DAL.job.getJob(jobGuid);
                        await writeTmBlock({ translationProvider: job.translationProvider, blockId: jobGuid}, [ tm.getJobByGuid(jobGuid) ]);
                    }
                } else if (tmStore.partitioning === 'provider') {
                    const jobsByProvider = {};
                    for (const jobGuid of jobsToUpdate) {
                        const job = this.#DAL.job.getJob(jobGuid);
                        jobsByProvider[job.translationProvider] ??= [];
                        jobsByProvider[job.translationProvider].push(job.jobGuid);
                    }
                    for (const jobs of Object.values(jobsByProvider)) {
                        await writeTmBlock({ translationProvider: jobs[0].translationProvider, blockId: this.generateJobGuid() }, tm.getJobsByGuids(jobs));
                    }
                } else if (tmStore.partitioning === 'language') {
                    await writeTmBlock({ blockId: this.generateJobGuid() }, tm.getJobsByGuids(jobsToUpdate));
                }
            }
        });
    }

    async getAvailableLangPairs() {
        return this.#DAL.job.getAvailableLangPairs();
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        return this.#DAL.job.getJobStatusByLangPair(sourceLang, targetLang);
    }

    async createJobManifest() {
        return {
            jobGuid: this.generateJobGuid(),
            status: 'created',
        };
    }

    async getJob(jobGuid) {
        const jobRow = this.#DAL.job.getJob(jobGuid);
        if (jobRow) {
            const tm = this.getTM(jobRow.sourceLang, jobRow.targetLang);
            const tus = tm.getEntriesByJobGuid(jobGuid);
            const inflight = tus.filter(tu => tu.inflight).map(tu => tu.guid);
            return { ...jobRow, tus, inflight };
        }
    }

    async deleteJob(jobGuid) {
        await this.#deleteJobContents(jobGuid);
    }
}
