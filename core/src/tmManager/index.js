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

    async saveTmBlock(tmBlockIterator, tmStoreId) {
        const jobs = [];
        for await (const job of tmBlockIterator) {
            if (job) {
                const { jobProps, tus } = job;
                if (tus?.length > 0) {
                    await this.#DAL.tu(jobProps.sourceLang, jobProps.targetLang).saveJob(jobProps, tus, tmStoreId);
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

    async #prepareSyncDownTask({ tmStore, sourceLang, targetLang, storeAlias }) {
        if (tmStore.access === 'writeonly') {
            throw new Error(`Cannot sync down ${tmStore.id} store because it is write-only!`);
        }
        const storeId = storeAlias ?? tmStore.id;
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = await this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const remoteJobs = deltas.filter(e => e.remoteJobGuid);
        const remoteJobsWithTimestampMismatch = remoteJobs.filter(e => e.tmStore === storeId);
        const remoteJobsMissingLocally = remoteJobs.filter(e => !e.localJobGuid);
        const remoteJobsWithTmStoreMismatch = remoteJobs.filter(e => e.tmStore && e.tmStore !== storeId);
        remoteJobs.length > 0 && logInfo`  - ${sourceLang} → ${targetLang}: ${remoteJobs.length} remote ${[remoteJobs.length, 'job', 'jobs']} have changes (${remoteJobsWithTimestampMismatch.length} with different timestamp, ${remoteJobsMissingLocally.length} missing locally, ${remoteJobsWithTmStoreMismatch.length} with tm store mismatch)`;
        remoteJobsWithTmStoreMismatch.length > 0 && logWarn`  - ${sourceLang} → ${targetLang} TM Store mismatch: ${remoteJobsWithTmStoreMismatch.map(e => `${e.remoteJobGuid} (${e.tmStore})`).join(', ')}`;
        const blocksToStore = Array.from(new Set(remoteJobsWithTimestampMismatch.concat(remoteJobsMissingLocally).map(e => e.blockId)));
        const jobsToDelete = deltas.filter(e => e.tmStore === storeId && !e.remoteJobGuid).map(e => e.localJobGuid); // local jobs with the same store id, but missing remotely
        return {
            sourceLang,
            targetLang,
            blocksToStore,
            jobsToDelete,
        };
    }

    async #syncDownTask({ tmStore, sourceLang, targetLang, blocksToStore, jobsToDelete, eraseParentTmStore, storeAlias }) {
        if (blocksToStore.length === 0 && jobsToDelete.length === 0) {
            return;
        }
        if (blocksToStore.length > 0) {
            logInfo`Storing ${blocksToStore.length} ${[blocksToStore.length, 'block', 'blocks']} from ${tmStore.id}(${sourceLang} → ${targetLang})`;
            await this.saveTmBlock(tmStore.getTmBlocks(sourceLang, targetLang, blocksToStore), eraseParentTmStore ? null : storeAlias ?? tmStore.id);
        }
        if (jobsToDelete.length > 0) {
            logInfo`Deleting ${jobsToDelete.length} ${[jobsToDelete.length, 'job', 'jobs']} (${sourceLang} → ${targetLang})`;
            for (const jobGuid of jobsToDelete) {
                await this.deleteJob(jobGuid);
            }
        }
    }

    async syncDown(tmStore, { dryrun, sourceLang, targetLang, deleteExtraJobs = false, eraseParentTmStore = false, storeAlias = null, parallelism = 4 }) {
        logInfo`Preparing sync down for store ${tmStore.id} [deleteExtraJobs: ${deleteExtraJobs}, eraseParentTmStore: ${eraseParentTmStore}, parallelism: ${parallelism}, storeAlias: ${storeAlias}]`;
        const pairs = sourceLang && targetLang ? [ [ sourceLang, targetLang ] ] : await tmStore.getAvailableLangPairs();
        const prepareQueue = fastq.promise(this, this.#prepareSyncDownTask, parallelism);
        const preparePromises = pairs.map(([ sourceLang, targetLang ]) => prepareQueue.push({ tmStore, sourceLang, targetLang, storeAlias }));
        const syncDownStats = await Promise.all(preparePromises);
        if (!dryrun) {
            const syncDownQueue = fastq.promise(this, this.#syncDownTask, parallelism);
            const syncDownPromises = syncDownStats.map(task => syncDownQueue.push({ tmStore, ...task, jobsToDelete: deleteExtraJobs ? task.jobsToDelete : [], eraseParentTmStore, storeAlias }));
            await Promise.all(syncDownPromises);
        }
        return syncDownStats;
    }

    async #prepareSyncUpTask({ tmStore, sourceLang, targetLang, deleteEmptyBlocks = false, includeUnassigned = false, storeAlias = null }) {
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = await this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc);
        const storeId = storeAlias ?? tmStore.id;

        // first go over differences with jobs that exist remotely in the tm store, these need to be updated by block
        const remoteJobs = deltas.filter(e => e.remoteJobGuid);
        const remoteJobsWithTimestampMismatch = remoteJobs.filter(e => e.tmStore === storeId);
        const remoteJobsToDeleteMissingLocally = remoteJobs.filter(e => !e.localJobGuid);
        const remoteJobsToDeleteWithTmStoreMismatch = remoteJobs.filter(e => e.tmStore && e.tmStore !== storeId);
        const remoteJobsToUpdate = deleteEmptyBlocks ? remoteJobsWithTimestampMismatch.concat(remoteJobsToDeleteMissingLocally, remoteJobsToDeleteWithTmStoreMismatch) : remoteJobsWithTimestampMismatch;
        const blocksToUpdateMap = {};
        for (const { blockId } of remoteJobsToUpdate) {
            if (!blocksToUpdateMap[blockId]) {
                const validJobIds = await this.#DAL.job.getValidJobIds(toc.sourceLang, toc.targetLang, toc, blockId);
                if (validJobIds.length > 0 || deleteEmptyBlocks) { // delete empty blocks only if allowed
                    blocksToUpdateMap[blockId] = validJobIds;
                }
            }
        }
        const blocksToUpdate = Object.entries(blocksToUpdateMap);

        // then go over jobs that only exist locally, these will be aggregated into blocks when the actual write happens
        const localJobs = deltas.filter(e => e.localJobGuid && !e.remoteJobGuid);
        const localJobsMatchingTmStore = localJobs.filter(e => e.tmStore === storeId); // this shouldn't be possible because and it should be included above
        const localJobsUnassigned = localJobs.filter(e => !e.tmStore);
        const localJobsToUpdate = includeUnassigned ? localJobsMatchingTmStore.concat(localJobsUnassigned) : localJobsMatchingTmStore;
        remoteJobs.length > 0 && logInfo`  - ${sourceLang} → ${targetLang}: ${remoteJobs.length} remote ${[remoteJobs.length, 'job', 'jobs']} have changes (${remoteJobsWithTimestampMismatch.length} with different timestamp, ${remoteJobsToDeleteMissingLocally.length} missing locally, ${remoteJobsToDeleteWithTmStoreMismatch.length} with tm store mismatch)`;
        localJobs.length > 0 && logInfo`  - ${sourceLang} → ${targetLang}: ${localJobs.length} local ${[localJobs.length, 'job', 'jobs']} are missing from tm store: ${localJobsMatchingTmStore.length} matching store id, ${localJobsUnassigned.length} unassigned`;

        return {
            sourceLang,
            targetLang,
            blocksToUpdate,
            jobsToUpdate: localJobsToUpdate.map(e => e.localJobGuid), // TODO: should really be called jobsToStore because it includes only jobs that are not in the tm store
        };
    }

    async #syncUpTask({ tmStore, sourceLang, targetLang, blocksToUpdate, jobsToUpdate, assignUnassigned, storeAlias }) {
        if (tmStore.access === 'readonly') {
            throw new Error(`Cannot sync up ${tmStore.id} store because it is readonly!`);
        }
        if (blocksToUpdate.length === 0 && jobsToUpdate.length === 0) {
            return;
        }
        const storeId = storeAlias ?? tmStore.id;
        await tmStore.getWriter(sourceLang, targetLang, async writeTmBlock => {
            const updatedJobs = new Set();
            if (blocksToUpdate.length > 0) {
                logInfo`Updating ${blocksToUpdate.length} ${[blocksToUpdate.length, 'block', 'blocks']} in ${tmStore.id} (${sourceLang} → ${targetLang})`;
                for (const [ blockId, jobs ] of blocksToUpdate) {
                    await writeTmBlock({ blockId }, this.getJobPropsTusPair(jobs));
                    for (const jobGuid of jobs) {
                        updatedJobs.add(jobGuid);
                        assignUnassigned && await this.#DAL.job.setJobTmStore(jobGuid, storeId);
                    }
                }
            }
            const filteredJobsToUpdate = jobsToUpdate.filter(jobGuid => !updatedJobs.has(jobGuid));
            if (filteredJobsToUpdate.length !== jobsToUpdate.length) { // this shouldn't be possible because the jobs should be updated in the blocks above
                logVerbose`${jobsToUpdate.length - filteredJobsToUpdate.length} ${[jobsToUpdate.length - filteredJobsToUpdate.length, 'job was skipped because it was', 'jobs were skipped because they were']} already updated`;
            }
            if (filteredJobsToUpdate.length > 0) {
                logInfo`Syncing ${filteredJobsToUpdate.length} ${[filteredJobsToUpdate.length, 'job', 'jobs']} to ${tmStore.id}`;
                if (tmStore.partitioning === 'job') {
                    for (const jobGuid of filteredJobsToUpdate) {
                        const { tus, ...jobProps } = await this.getJob(jobGuid);
                        await writeTmBlock({ translationProvider: jobProps.translationProvider, blockId: jobGuid}, [ { jobProps, tus } ]);
                        assignUnassigned && await this.#DAL.job.setJobTmStore(jobGuid, storeId);
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
                        if (assignUnassigned) {
                            for (const jobGuid of jobs) {
                                await this.#DAL.job.setJobTmStore(jobGuid, storeId);
                            }
                        }
                    }
                } else if (tmStore.partitioning === 'language') {
                    await writeTmBlock({ blockId: await this.generateJobGuid() }, this.getJobPropsTusPair(filteredJobsToUpdate));
                    if (assignUnassigned) {
                        for (const jobGuid of filteredJobsToUpdate) {
                            await this.#DAL.job.setJobTmStore(jobGuid, storeId);
                        }
                    }
                }
            }
        });
    }

    async syncUp(tmStore, { dryrun, sourceLang, targetLang, deleteEmptyBlocks = false, includeUnassigned = true, assignUnassigned = true, storeAlias = null, parallelism = 4 }) {
        logInfo`Preparing sync up for store ${tmStore.id} [deleteEmptyBlocks: ${deleteEmptyBlocks}, includeUnassigned: ${includeUnassigned}, parallelism: ${parallelism}]`;
        const pairs = sourceLang && targetLang ? [ [ sourceLang, targetLang ] ] : await this.getAvailableLangPairs();
        const prepareQueue = fastq.promise(this, this.#prepareSyncUpTask, parallelism);
        const preparePromises = pairs.map(([ sourceLang, targetLang ]) => prepareQueue.push({
            tmStore,
            sourceLang,
            targetLang,
            deleteEmptyBlocks,
            includeUnassigned,
            storeAlias,
        }));
        const syncUpStats = await Promise.all(preparePromises);
        if (!dryrun) {
            const syncUpQueue = fastq.promise(this, this.#syncUpTask, parallelism);
            const syncUpPromises = syncUpStats.map(task => syncUpQueue.push({ tmStore, assignUnassigned, storeAlias, ...task }));
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
