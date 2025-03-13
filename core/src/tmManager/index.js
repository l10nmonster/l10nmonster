import * as path from 'path';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

import { L10nContext, TU, utils } from '@l10nmonster/core';
import { TM } from './tm.js';
import { JobDAL } from './jobDAL.js';

export default class TMManager {
    #db;
    #jobDAL;
    #tmCache = new Map();

    #generateGuid() {
        if (L10nContext.regression) {
            const jobCount = this.#jobDAL.getJobCount();
            return `xxx${jobCount}xxx`;
        } else {
            return nanoid();
        }
    }

    async #saveTmBlock(tmBlockIterator) {
        const jobs = [];
        const insertJob = this.#db.transaction(job => {
            const { jobProps, tus } = job;
            this.#jobDAL.setJob(jobProps);
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
        const job = this.#jobDAL.getJob(jobGuid);
        const tm = this.getTM(job.sourceLang, job.targetLang);
        tm.deleteEntriesByJobGuid(jobGuid);
        this.#jobDAL.deleteJob(jobGuid);
    }

    constructor() {
        this.#db = new Database(path.join(L10nContext.baseDir, 'l10nmonsterTM.db'));
        // this.#db.pragma('journal_mode = WAL');
        const version = this.#db.prepare('select sqlite_version();').pluck().get();
        L10nContext.logger.verbose(`Initialized sqlite version: ${version}`);
        this.#jobDAL = new JobDAL(this.#db);
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
    }

    getTM(sourceLang, targetLang) {
        const key = `${sourceLang}#${targetLang}`;
        if (this.#tmCache.has(key)) {
            return this.#tmCache.get(key);
        } else {
            const tm = new TM(sourceLang, targetLang, this.#db, this.#jobDAL);
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
        const deltas = this.#jobDAL.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
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
            L10nContext.logger.info(`Nothing to sync up with store ${tmStore.id}`);
            return;
        }
        if (blocksToStore.length > 0) {
            L10nContext.logger.info(`Storing ${blocksToStore.length} ${[blocksToStore.length, 'block', 'blocks']} from ${tmStore.id}`);
            await this.#saveTmBlock(tmStore.getTmBlocks(sourceLang, targetLang, blocksToStore));
        }
        if (jobsToDelete.length > 0) {
            L10nContext.logger.info(`Deleting ${jobsToDelete.length} ${[jobsToDelete.length, 'job', 'jobs']}`);
            for (const jobGuid of jobsToDelete) {
                await this.#deleteJobContents(jobGuid);
            }
        }
    }

    async prepareSyncUp(tmStore, sourceLang, targetLang, options) {
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = this.#jobDAL.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const blockIdsToUpdate = new Set(deltas.filter(e => e.remoteJobGuid).map(e => e.blockId)); // either because they changed or because some jobs don't exist locally and need to be deleted remotely
        let jobsToUpdate = deltas.filter(e => e.localJobGuid).map(e => [ e.localJobGuid, e.localUpdatedAt ]); // this will catch changed jobs and jobs that don't exist remotely
        if (jobsToUpdate.length > 0 && options?.newerOnly) {
            const highWaterMark = Math.max(...Object.values(toc.blocks).map(blockProps => Math.max(...blockProps.jobs.map(e => new Date(e[1]).getTime()))));
            jobsToUpdate = jobsToUpdate.filter(e => new Date(e[1]).getTime() > highWaterMark);
        }
        return {
            sourceLang,
            targetLang,
            blocksToUpdate: Array.from(blockIdsToUpdate).map(blockId => [ blockId, this.#jobDAL.getValidJobIds(toc.sourceLang, toc.targetLang, toc, blockId) ]),
            jobsToUpdate: jobsToUpdate.map(e => e[0]),
        };
    }

    async syncUp(tmStore, { sourceLang, targetLang, blocksToUpdate, jobsToUpdate }) {
        if (tmStore.access === 'readonly') {
            throw new Error(`Cannot sync up ${tmStore.id} store because it is readonly!`);
        }
        if (blocksToUpdate.length === 0 && jobsToUpdate.length === 0) {
            L10nContext.logger.info(`Nothing to sync up with store ${tmStore.id}`);
            return;
        }

        const tm = this.getTM(sourceLang, targetLang);
        await tmStore.getWriter(sourceLang, targetLang, async writeTmBlock => {
            if (blocksToUpdate.length > 0) {
                L10nContext.logger.info(`Updating ${blocksToUpdate.length} ${[blocksToUpdate.length, 'block', 'blocks']} in ${tmStore.id}`);
                for (const [ blockId, jobs ] of blocksToUpdate) {
                    await writeTmBlock({ blockId }, tm.getJobsByGuids(jobs));
                }
            }
            if (jobsToUpdate.length > 0) {
                L10nContext.logger.info(`Syncing ${jobsToUpdate.length} ${[jobsToUpdate.length, 'job', 'jobs']} to ${tmStore.id}`);
                if (tmStore.partitioning === 'job') {
                    for (const jobGuid of jobsToUpdate) {
                        const job = this.#jobDAL.getJob(jobGuid);
                        await writeTmBlock({ translationProvider: job.translationProvider, blockId: jobGuid}, [ tm.getJobByGuid(jobGuid) ]);
                    }
                } else if (tmStore.partitioning === 'provider') {
                    const jobsByProvider = {};
                    for (const jobGuid of jobsToUpdate) {
                        const job = this.#jobDAL.getJob(jobGuid);
                        jobsByProvider[job.translationProvider] ??= [];
                        jobsByProvider[job.translationProvider].push(job.jobGuid);
                    }
                    for (const jobs of Object.values(jobsByProvider)) {
                        await writeTmBlock({ translationProvider: jobs[0].translationProvider, blockId: this.#generateGuid() }, tm.getJobsByGuids(jobs));
                    }
                } else if (tmStore.partitioning === 'language') {
                    await writeTmBlock({ blockId: this.#generateGuid() }, tm.getJobsByGuids(jobsToUpdate));
                }
            }
        });
    }

    // use cases:
    //   1 - both are passed as both are created at the same time -> may cancel if response is empty
    //   2 - only jobRequest is passed because it's blocked -> write if "blocked", cancel if "created"
    //   3 - only jobResponse is passed because it's pulled -> must write even if empty or it will show as blocked/pending
    async processJob(jobResponse, jobRequest) {
        if (jobRequest && jobResponse && !(jobResponse.tus?.length > 0 || jobResponse.inflight?.length > 0)) {
            jobResponse.status = 'cancelled';
            return;
        }
        if (jobRequest && !jobResponse && jobRequest.status === 'created') {
            jobRequest.status = 'cancelled';
            return;
        }
        const updatedAt = (L10nContext.regression ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
        if (jobRequest) {
            jobRequest.updatedAt = updatedAt;
            if (jobResponse) {
                const guidsInFlight = jobResponse.inflight ?? [];
                const translatedGuids = jobResponse?.tus?.map(tu => tu.guid) ?? [];
                const acceptedGuids = new Set(guidsInFlight.concat(translatedGuids));
                jobRequest.tus = jobRequest.tus.filter(tu => acceptedGuids.has(tu.guid));
            }
            jobRequest.tus = jobRequest.tus.map(TU.asSource);
        }
        if (jobResponse) {
            jobResponse.updatedAt = updatedAt;
            jobResponse.tus && (jobResponse.tus = jobResponse.tus.map(TU.asTarget));
        }
        await this.#saveTmBlock(utils.getIteratorFromJobPair(jobRequest, jobResponse));
    }

    async getAvailableLangPairs() {
        return this.#jobDAL.getAvailableLangPairs();
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        return this.#jobDAL.getJobStatusByLangPair(sourceLang, targetLang);
    }

    async createJobManifest() {
        return {
            jobGuid: this.#generateGuid(),
            status: 'created',
        };
    }

    async getJob(jobGuid) {
        const jobRow = this.#jobDAL.getJob(jobGuid);
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

    async shutdown() {
        this.#db.close();
    }
}
