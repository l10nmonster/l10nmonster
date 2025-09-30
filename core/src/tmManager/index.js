import { nanoid } from 'nanoid';
import fastq from 'fastq';

import { getRegressionMode, logInfo, logVerbose, logWarn } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { TM } from './tm.js';


export default class TMManager {
    #DAL;
    #tmStores;
    #tmCache = new Map();

    constructor(dal, tmStores) {
        this.#DAL = dal;
        this.#tmStores = tmStores ?? {};
    }

    // eslint-disable-next-line no-unused-vars
    async init(mm) {
        for (const tmStore of Object.values(this.#tmStores)) {
            typeof tmStore.init === 'function' && await tmStore.init(this);
        }
        logVerbose`TMManager initialized`;
    }

    async generateJobGuid() {
        if (getRegressionMode()) {
            const jobCount = await this.#DAL.job.getJobCount();
            return `xxx${jobCount}xxx`;
        } else {
            return nanoid();
        }
    }

    async saveTmBlock(tmBlockIterator) {
        const jobs = [];
        for await (const job of tmBlockIterator) {
            if (job) {
                const { jobProps, tus } = job;
                if (tus?.length > 0) {
                    await this.#DAL.tu(jobProps.sourceLang, jobProps.targetLang).saveJob(jobProps, tus);
                    jobs.push(jobProps);
                } else {
                    logVerbose`Ignoring empty job ${job.jobGuid}`;
                }
            } else {
                logWarn`Received a nullish job while saving a TM block`;
            }
        }
        return jobs;
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

    getTmStore(id) {
        const fixedId = utils.fixCaseInsensitiveKey(this.#tmStores, id);
        if (fixedId) {
            return this.#tmStores[fixedId];
        } else {
            throw new Error(`Unknown tm store: ${id}`);
        }
    }

    getTmStoreInfo(id) {
        const tmStore = this.getTmStore(id);
        return {
            id: tmStore.id,
            type: tmStore.constructor.name,
            access: tmStore.access,
            partitioning: tmStore.partitioning,
        };
    }

    async getTmStoreTOCs(tmStore, parallelism = 8) {
        const queue = fastq.promise(async ([srcLang, tgtLang]) => tmStore.getTOC(srcLang, tgtLang), parallelism);
        const pairs = await tmStore.getAvailableLangPairs(tmStore);
        const tocPromises = pairs.map(pair => queue.push(pair));
        const tocs = await Promise.all(tocPromises);
        return pairs.map(([srcLang, tgtLang], index) => [ srcLang, tgtLang, tocs[index] ]);
    }

    get tmStoreIds() {
        return Object.keys(this.#tmStores);
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

    async #prepareSyncDownTask({ tmStore, sourceLang, targetLang }) {
        if (tmStore.access === 'writeonly') {
            throw new Error(`Cannot sync down ${tmStore.id} store because it is write-only!`);
        }
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = await this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const blocksToStore = Array.from(new Set(deltas.filter(e => e.remoteJobGuid).map(e => e.blockId))); // either because they changed or because some jobs don't exist locally
        let jobsToDelete = deltas.filter(e => e.localJobGuid && !e.remoteJobGuid).map(e => e.localJobGuid);
        return {
            sourceLang,
            targetLang,
            blocksToStore,
            jobsToDelete,
        };
    }

    async #syncDownTask({ tmStore, sourceLang, targetLang, blocksToStore, jobsToDelete }) {
        if (blocksToStore.length === 0 && jobsToDelete.length === 0) {
            return;
        }
        if (blocksToStore.length > 0) {
            logInfo`Storing ${blocksToStore.length} ${[blocksToStore.length, 'block', 'blocks']} from ${tmStore.id}(${sourceLang} → ${targetLang})`;
            await this.saveTmBlock(tmStore.getTmBlocks(sourceLang, targetLang, blocksToStore));
        }
        if (jobsToDelete.length > 0) {
            logInfo`Deleting ${jobsToDelete.length} ${[jobsToDelete.length, 'job', 'jobs']} (${sourceLang} → ${targetLang})`;
            for (const jobGuid of jobsToDelete) {
                await this.deleteJob(jobGuid);
            }
        }
    }

    async syncDown(tmStore, { dryrun, sourceLang, targetLang, deleteExtraJobs = false, parallelism = 4 }) {
        const pairs = sourceLang && targetLang ? [ [ sourceLang, targetLang ] ] : await tmStore.getAvailableLangPairs();
        const prepareQueue = fastq.promise(this, this.#prepareSyncDownTask, parallelism);
        const preparePromises = pairs.map(([ sourceLang, targetLang ]) => prepareQueue.push({ tmStore, sourceLang, targetLang }));
        const syncDownStats = await Promise.all(preparePromises);
        if (!dryrun) {
            const syncUpQueue = fastq.promise(this, this.#syncDownTask, parallelism);
            const syncUpPromises = syncDownStats.map(task => syncUpQueue.push({ tmStore, ...task, jobsToDelete: deleteExtraJobs ? task.jobsToDelete : [] }));
            await Promise.all(syncUpPromises);
        }
        return syncDownStats;
    }

    async #prepareSyncUpTask({ tmStore, sourceLang, targetLang, newerOnly = false, deleteEmptyBlocks = false }) {
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = await this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const blockIdsToUpdate = new Set(deltas.filter(e => e.remoteJobGuid).map(e => e.blockId)); // either because they changed or because some jobs don't exist locally and need to be deleted remotely
        let blocksToUpdate = [];
        for (const blockId of blockIdsToUpdate) {
            blocksToUpdate.push([ blockId, await this.#DAL.job.getValidJobIds(toc.sourceLang, toc.targetLang, toc, blockId) ]);
        }
        const blocksToDelete = blocksToUpdate.filter(e => e[1].length === 0); // if there are no jobs to write the block gets deleted
        if (blocksToDelete.length > 0 && !deleteEmptyBlocks) {
            blocksToUpdate = blocksToUpdate.filter(e => e[1].length > 0);
        }
        let jobsToUpdate = deltas.filter(e => e.localJobGuid).map(e => [ e.localJobGuid, e.localUpdatedAt ]); // this will catch changed jobs and jobs that don't exist remotely
        if (jobsToUpdate.length > 0 && newerOnly) {
            const highWaterMark = Math.max(...Object.values(toc.blocks).map(blockProps => Math.max(...blockProps.jobs.map(e => new Date(e[1]).getTime()))));
            jobsToUpdate = jobsToUpdate.filter(e => new Date(e[1]).getTime() > highWaterMark);
        }
        return {
            sourceLang,
            targetLang,
            blocksToUpdate,
            jobsToUpdate: jobsToUpdate.map(e => e[0]),
        };
    }

    async #syncUpTask({ tmStore, sourceLang, targetLang, blocksToUpdate, jobsToUpdate }) {
        if (tmStore.access === 'readonly') {
            throw new Error(`Cannot sync up ${tmStore.id} store because it is readonly!`);
        }
        if (blocksToUpdate.length === 0 && jobsToUpdate.length === 0) {
            return;
        }

        await tmStore.getWriter(sourceLang, targetLang, async writeTmBlock => {
            const updatedJobs = new Set();
            if (blocksToUpdate.length > 0) {
                logInfo`Updating ${blocksToUpdate.length} ${[blocksToUpdate.length, 'block', 'blocks']} in ${tmStore.id}`;
                for (const [ blockId, jobs ] of blocksToUpdate) {
                    await writeTmBlock({ blockId }, this.getJobPropsTusPair(jobs));
                    jobs.forEach(jobGuid => updatedJobs.add(jobGuid));
                }
            }
            const filteredJobsToUpdate = jobsToUpdate.filter(jobGuid => !updatedJobs.has(jobGuid));
            if (filteredJobsToUpdate.length !== jobsToUpdate.length) {
                logVerbose`${jobsToUpdate.length - filteredJobsToUpdate.length} ${[jobsToUpdate.length - filteredJobsToUpdate.length, 'job was skipped because it was', 'jobs were skipped because they were']} already updated`;
            }
            if (filteredJobsToUpdate.length > 0) {
                logInfo`Syncing ${filteredJobsToUpdate.length} ${[filteredJobsToUpdate.length, 'job', 'jobs']} to ${tmStore.id}`;
                if (tmStore.partitioning === 'job') {
                    for (const jobGuid of filteredJobsToUpdate) {
                        const { tus, ...jobProps } = await this.getJob(jobGuid);
                        await writeTmBlock({ translationProvider: jobProps.translationProvider, blockId: jobGuid}, [ { jobProps, tus } ]);
                    }
                } else if (tmStore.partitioning === 'provider') {
                    const jobsByProvider = {};
                    for (const jobGuid of filteredJobsToUpdate) {
                        const job = await this.#DAL.job.getJob(jobGuid);
                        jobsByProvider[job.translationProvider] ??= [];
                        jobsByProvider[job.translationProvider].push(job.jobGuid);
                    }
                    for (const [ translationProvider, jobs ] of Object.entries(jobsByProvider)) {
                        await writeTmBlock({ translationProvider, blockId: await this.generateJobGuid() }, this.getJobPropsTusPair(jobs));
                    }
                } else if (tmStore.partitioning === 'language') {
                    await writeTmBlock({ blockId: await this.generateJobGuid() }, this.getJobPropsTusPair(filteredJobsToUpdate));
                }
            }
        });
    }

    async syncUp(tmStore, { dryrun, sourceLang, targetLang, newerOnly = false, deleteEmptyBlocks = false, parallelism = 4 }) {
        const pairs = sourceLang && targetLang ? [ [ sourceLang, targetLang ] ] : await this.getAvailableLangPairs();
        const prepareQueue = fastq.promise(this, this.#prepareSyncUpTask, parallelism);
        const preparePromises = pairs.map(([ sourceLang, targetLang ]) => prepareQueue.push({
            tmStore,
            sourceLang,
            targetLang,
            newerOnly,
            deleteEmptyBlocks,
        }));
        const syncUpStats = await Promise.all(preparePromises);
        if (!dryrun) {
            const syncUpQueue = fastq.promise(this, this.#syncUpTask, parallelism);
            const syncUpPromises = syncUpStats.map(task => syncUpQueue.push({ tmStore, ...task }));
            await Promise.all(syncUpPromises);
        }
        return syncUpStats;
    }

    async getAvailableLangPairs() {
        return await this.#DAL.job.getAvailableLangPairs();
    }

    async getJobTOCByLangPair(sourceLang, targetLang) {
        return await this.#DAL.job.getJobTOCByLangPair(sourceLang, targetLang);
    }

    // async createJobManifest() {
    //     return {
    //         jobGuid: await this.generateJobGuid(),
    //         status: 'created',
    //     };
    // }

    async getJob(jobGuid) {
        const jobRow = await this.#DAL.job.getJob(jobGuid);
        if (jobRow) {
            const job = { ...jobRow, tus: await this.#DAL.tu(jobRow.sourceLang, jobRow.targetLang).getEntriesByJobGuid(jobGuid) };
            const inflight = job.tus.filter(tu => tu.inflight).map(tu => tu.guid);
            inflight.length > 0 && (job.inflight = inflight);
            return job;
        }
    }

    async *getJobPropsTusPair(jobGuids) {
        for (const jobGuid of jobGuids) {
            const jobProps = await this.#DAL.job.getJob(jobGuid);
            const tus = await this.#DAL.tu(jobProps.sourceLang, jobProps.targetLang).getEntriesByJobGuid(jobGuid);
            yield { jobProps, tus };
        }
    }

    async *getAllJobs(sourceLang, targetLang) {
        const allJobs = await this.#DAL.job.getJobTOCByLangPair(sourceLang, targetLang).map(e => e.jobGuid);
        for (const jobGuid of allJobs) {
            yield await this.getJob(jobGuid);
        }
    }

    async deleteJob(jobGuid) {
        const job = await this.#DAL.job.getJob(jobGuid);
        if (!job) {
            throw new Error(`Job ${jobGuid} does not exist`);
        }
        await this.#DAL.tu(job.sourceLang, job.targetLang).deleteJob(jobGuid);
    }
}
