import { nanoid } from 'nanoid';
import fastq from 'fastq';

import { getRegressionMode, logInfo, logVerbose, logWarn } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { TM } from './tm.js';
import { groupObjectsByNestedProps } from '../sharedFunctions.js';

/**
 * @typedef {import('../../index.js').TMStore} TMStore
 * @typedef {import('../../index.js').TMStoreTOC} TMStoreTOC
 * @typedef {import('../../index.js').JobPropsTusPair} JobPropsTusPair
 * @typedef {import('../../index.js').Job} Job
 * @typedef {import('../../index.js').DALManager} DALManager
 * @typedef {import('../entities/tu.js').TU} TU
 */

/**
 * TM Store information.
 * @typedef {Object} TmStoreInfo
 * @property {string} id - TM store identifier.
 * @property {string} type - TM store class name.
 * @property {string} access - Access permissions ('readwrite', 'readonly', 'writeonly').
 * @property {string} partitioning - Partitioning strategy ('none', 'job', 'provider', 'language').
 */

/**
 * Sync down options.
 * @typedef {Object} SyncDownOptions
 * @property {boolean} [dryrun] - If true, don't actually sync, just return stats.
 * @property {string} [sourceLang] - Filter to specific source language.
 * @property {string} [targetLang] - Filter to specific target language.
 * @property {boolean} [deleteExtraJobs=false] - Delete local jobs not in remote store.
 * @property {boolean} [eraseParentTmStore=false] - Clear parent TM store assignment.
 * @property {string} [storeAlias=null] - Use alternative store ID for assignments.
 * @property {number} [parallelism=4] - Number of parallel operations.
 */

/**
 * Sync up options.
 * @typedef {Object} SyncUpOptions
 * @property {boolean} [dryrun] - If true, don't actually sync, just return stats.
 * @property {string} [sourceLang] - Filter to specific source language.
 * @property {string} [targetLang] - Filter to specific target language.
 * @property {boolean} [deleteEmptyBlocks=false] - Delete blocks with no jobs.
 * @property {boolean} [includeUnassigned=true] - Include jobs not assigned to any store.
 * @property {boolean} [assignUnassigned=true] - Assign unassigned jobs to this store.
 * @property {string} [storeAlias=null] - Use alternative store ID for assignments.
 * @property {number} [parallelism=4] - Number of parallel operations.
 */

/**
 * Sync down statistics for a language pair.
 * @typedef {Object} SyncDownStats
 * @property {string} sourceLang - Source language code.
 * @property {string} targetLang - Target language code.
 * @property {string[]} blocksToStore - Block IDs that need to be stored from remote.
 * @property {string[]} jobsToDelete - Job GUIDs to delete locally.
 */

/**
 * Sync up statistics for a language pair.
 * @typedef {Object} SyncUpStats
 * @property {string} sourceLang - Source language code.
 * @property {string} targetLang - Target language code.
 * @property {[string, string[]][]} blocksToUpdate - Block ID and job GUID pairs to update in remote.
 * @property {string[]} jobsToUpdate - Job GUIDs to store in remote.
 */

/**
 * Manages Translation Memory operations including job storage,
 * TM queries, and synchronization with external TM stores.
 */
export default class TMManager {
    #DAL;
    #tmStores;
    #tmCache = new Map();

    /**
     * Creates a new TMManager instance.
     * @param {DALManager} dal - Data Access Layer manager for database operations.
     * @param {Record<string, TMStore>} [tmStores] - Map of TM store ID to TMStore instance.
     */
    constructor(dal, tmStores) {
        this.#DAL = dal;
        this.#tmStores = tmStores ?? {};
    }

    /**
     * Initializes the TMManager and all configured TM stores.
     * @param {import('../monsterManager/index.js').MonsterManager} mm - The MonsterManager instance.
     * @returns {Promise<void>}
     */
    // eslint-disable-next-line no-unused-vars
    async init(mm) {
        logVerbose`TMManager initialized`;
    }

    /**
     * Generates a unique job GUID (deterministic in regression mode).
     * @returns {Promise<string>} A unique job identifier.
     */
    async generateJobGuid() {
        if (getRegressionMode()) {
            const jobCount = await this.#DAL.job.getJobCount();
            return `xxx${jobCount}xxx`;
        } else {
            return nanoid();
        }
    }

    /**
     * Gets a TM instance for a language pair (cached).
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @returns {TM} The TM instance for querying translations.
     */
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

    /**
     * Gets a TM store by ID (case-insensitive lookup).
     * @param {string} id - TM store identifier.
     * @returns {TMStore} The TM store instance.
     * @throws {Error} If the TM store is not found.
     */
    getTmStore(id) {
        const fixedId = utils.fixCaseInsensitiveKey(this.#tmStores, id);
        if (fixedId) {
            return this.#tmStores[fixedId];
        } else {
            throw new Error(`Unknown tm store: ${id}`);
        }
    }

    /**
     * Gets information about a TM store.
     * @param {string} id - TM store identifier.
     * @returns {TmStoreInfo} TM store information.
     */
    getTmStoreInfo(id) {
        const tmStore = this.getTmStore(id);
        return {
            id: tmStore.id,
            type: tmStore.constructor.name,
            access: tmStore.access,
            partitioning: tmStore.partitioning,
        };
    }

    /**
     * Gets tables of contents for all language pairs in a TM store.
     * @param {TMStore} tmStore - The TM store to query.
     * @param {number} [parallelism=8] - Number of parallel TOC fetches.
     * @returns {Promise<Array<[string, string, Object]>>} Array of [sourceLang, targetLang, TOC] tuples.
     */
    async getTmStoreTOCs(tmStore, parallelism = 8) {
        const queue = fastq.promise(async ([srcLang, tgtLang]) => tmStore.getTOC(srcLang, tgtLang), parallelism);
        const pairs = await tmStore.getAvailableLangPairs();
        const tocPromises = pairs.map(pair => queue.push(pair));
        const tocs = await Promise.all(tocPromises);
        return pairs.map(([srcLang, tgtLang], index) => [ srcLang, tgtLang, tocs[index] ]);
    }

    /**
     * Gets the list of configured TM store IDs.
     * @returns {string[]} Array of TM store identifiers.
     */
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

    async #syncDownTask({ tmStore, sourceLang, targetLang, dryrun, deleteExtraJobs, eraseParentTmStore, storeAlias }) {
        if (tmStore.access === 'writeonly') {
            throw new Error(`Cannot sync down ${tmStore.id} store because it is write-only!`);
        }
        const storeId = storeAlias ?? tmStore.id;
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = await this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc, storeId);
        const remoteJobs = deltas.filter(e => e.remoteJobGuid);
        const remoteJobsWithTimestampMismatch = remoteJobs.filter(e => e.tmStore === storeId);
        const remoteJobsMissingLocally = remoteJobs.filter(e => !e.localJobGuid);
        const remoteJobsWithTmStoreMismatch = remoteJobs.filter(e => e.tmStore && e.tmStore !== storeId);
        remoteJobs.length > 0 && logInfo`  - ${sourceLang} → ${targetLang}: ${remoteJobs.length} remote ${[remoteJobs.length, 'job', 'jobs']} have changes (${remoteJobsWithTimestampMismatch.length} with different timestamp, ${remoteJobsMissingLocally.length} missing locally, ${remoteJobsWithTmStoreMismatch.length} with tm store mismatch)`;
        remoteJobsWithTmStoreMismatch.length > 0 && logWarn`  - ${sourceLang} → ${targetLang} TM Store mismatch: ${remoteJobsWithTmStoreMismatch.map(e => `${e.remoteJobGuid} (${e.tmStore})`).join(', ')}`;
        const blocksToStore = Array.from(new Set(remoteJobsWithTimestampMismatch.concat(remoteJobsMissingLocally).map(e => e.blockId)));
        const jobsToDelete = deltas.filter(e => e.tmStore === storeId && !e.remoteJobGuid).map(e => e.localJobGuid); // local jobs with the same store id, but missing remotely

        if (!dryrun) {
            if (blocksToStore.length > 0) {
                logInfo`Storing ${blocksToStore.length} ${[blocksToStore.length, 'block', 'blocks']} from ${tmStore.id}(${sourceLang} → ${targetLang})`;
                const tm = this.getTM(sourceLang, targetLang);
                await tm.saveTmBlock(tmStore.getTmBlocks(sourceLang, targetLang, blocksToStore), {
                    tmStoreId: eraseParentTmStore ? null : storeAlias ?? tmStore.id
                });
            }
            if (deleteExtraJobs && jobsToDelete.length > 0) {
                logInfo`Deleting ${jobsToDelete.length} ${[jobsToDelete.length, 'job', 'jobs']} (${sourceLang} → ${targetLang})`;
                for (const jobGuid of jobsToDelete) {
                    await this.deleteJob(jobGuid);
                }
            }
        }
        return {
            sourceLang,
            targetLang,
            blocksToStore,
            jobsToDelete,
        };
    }

    /**
     * Synchronizes translations from a remote TM store to local database.
     * @param {TMStore} tmStore - The TM store to sync from.
     * @param {SyncDownOptions} options - Sync options.
     * @returns {Promise<SyncDownStats[]>} Array of sync statistics per language pair.
     */
    async syncDown(tmStore, { dryrun, sourceLang, targetLang, deleteExtraJobs = false, eraseParentTmStore = false, storeAlias = null, parallelism = 4 }) {
        logInfo`Preparing sync down for store ${tmStore.id} [deleteExtraJobs: ${deleteExtraJobs}, eraseParentTmStore: ${eraseParentTmStore}, parallelism: ${parallelism}, storeAlias: ${storeAlias}]`;
        const pairs = sourceLang && targetLang ? [ [ sourceLang, targetLang ] ] : await tmStore.getAvailableLangPairs();
        const syncDownQueue = fastq.promise(this, this.#syncDownTask, parallelism);
        const syncDownPromises = pairs.map(([ sourceLang, targetLang ]) => syncDownQueue.push({ tmStore, sourceLang, targetLang, dryrun, deleteExtraJobs, eraseParentTmStore, storeAlias }));
        const syncDownStats = await Promise.all(syncDownPromises);
        return syncDownStats;
    }

    async #prepareSyncUpTask({ tmStore, sourceLang, targetLang, deleteEmptyBlocks = false, includeUnassigned = false, storeAlias = null }) {
        const storeId = storeAlias ?? tmStore.id;
        const toc = await tmStore.getTOC(sourceLang, targetLang);
        const deltas = await this.#DAL.job.getJobDeltas(toc.sourceLang, toc.targetLang, toc, storeId);

        // first go over differences with jobs that exist remotely in the tm store, these need to be updated by block
        const remoteJobs = deltas.filter(e => e.remoteJobGuid);
        const remoteJobsWithTimestampMismatch = remoteJobs.filter(e => e.tmStore === storeId);
        const remoteJobsToDeleteMissingLocally = remoteJobs.filter(e => !e.localJobGuid);
        const remoteJobsToDeleteWithTmStoreMismatch = remoteJobs.filter(e => e.tmStore && e.tmStore !== storeId);
        const remoteJobsToUpdate = deleteEmptyBlocks ? remoteJobsWithTimestampMismatch.concat(remoteJobsToDeleteMissingLocally, remoteJobsToDeleteWithTmStoreMismatch) : remoteJobsWithTimestampMismatch;
        const blocksToUpdateMap = {};
        for (const { blockId } of remoteJobsToUpdate) {
            if (!blocksToUpdateMap[blockId]) {
                const validJobIds = await this.#DAL.job.getValidJobIds(toc.sourceLang, toc.targetLang, toc, blockId, storeId);
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

    /**
     * Synchronizes translations from local database to a remote TM store.
     * @param {TMStore} tmStore - The TM store to sync to.
     * @param {SyncUpOptions} options - Sync options.
     * @returns {Promise<SyncUpStats[]>} Array of sync statistics per language pair.
     */
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

    /**
     * Gets all available language pairs from the job database.
     * @returns {Promise<Array<[string, string]>>} Array of [sourceLang, targetLang] pairs.
     */
    async getAvailableLangPairs() {
        return await this.#DAL.job.getAvailableLangPairs();
    }

    /**
     * Gets TM statistics grouped by language pair.
     * @returns {Promise<Object>} Statistics grouped by sourceLang -> targetLang.
     */
    async getStats() {
        const rawStats = await this.#DAL.job.getStats();
        return groupObjectsByNestedProps(rawStats, [ 'sourceLang', 'targetLang' ]);
    }

    /**
     * Gets job table of contents for a language pair.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @returns {Promise<Object[]>} Array of job entries with metadata.
     */
    async getJobTOCByLangPair(sourceLang, targetLang) {
        return await this.#DAL.job.getJobTOCByLangPair(sourceLang, targetLang);
    }

    /**
     * Gets a job by GUID including its translation units.
     * @param {string} jobGuid - Job identifier.
     * @returns {Promise<Job|undefined>} The job with TUs, or undefined if not found.
     */
    async getJob(jobGuid) {
        const jobRow = await this.#DAL.job.getJob(jobGuid);
        if (jobRow) {
            const tus = await this.#DAL.tu(jobRow.sourceLang, jobRow.targetLang).getEntriesByJobGuid(jobGuid);
            const inflight = tus.filter(tu => tu.inflight).map(tu => tu.guid);

            /** @type {import('../interfaces.js').Job} */
            const job = { ...jobRow, tus };
            inflight.length > 0 && (job.inflight = inflight);
            return job;
        }
    }

    /**
     * Yields job properties and TUs for a list of job GUIDs.
     * @param {string[]} jobGuids - Array of job identifiers.
     * @yields {JobPropsTusPair} Job properties and TUs pair.
     * @returns {AsyncGenerator<JobPropsTusPair>} Async generator of job/TU pairs.
     */
    async *getJobPropsTusPair(jobGuids) {
        for (const jobGuid of jobGuids) {
            const jobProps = await this.#DAL.job.getJob(jobGuid);
            const tus = await this.#DAL.tu(jobProps.sourceLang, jobProps.targetLang).getEntriesByJobGuid(jobGuid);
            yield { jobProps, tus };
        }
    }

    /**
     * Yields all jobs for a language pair.
     * @param {string} sourceLang - Source language code.
     * @param {string} targetLang - Target language code.
     * @yields {Job} Jobs with TUs.
     * @returns {AsyncGenerator<Job>} Async generator of jobs.
     */
    async *getAllJobs(sourceLang, targetLang) {
        const allJobs = (await this.#DAL.job.getJobTOCByLangPair(sourceLang, targetLang)).map(e => e.jobGuid);
        for (const jobGuid of allJobs) {
            yield await this.getJob(jobGuid);
        }
    }

    /**
     * Deletes a job and all its translation units.
     * @param {string} jobGuid - Job identifier to delete.
     * @throws {Error} If the job does not exist.
     * @returns {Promise<void>}
     */
    async deleteJob(jobGuid) {
        const job = await this.#DAL.job.getJob(jobGuid);
        if (!job) {
            throw new Error(`Job ${jobGuid} does not exist`);
        }
        await this.#DAL.tu(job.sourceLang, job.targetLang).deleteJob(jobGuid);
    }

    /**
     * Bootstrap task for a single language pair.
     * @param {Object} params - Task parameters.
     * @param {TMStore} params.tmStore - The TM store to bootstrap from.
     * @param {string} params.srcLang - Source language.
     * @param {string} params.tgtLang - Target language.
     * @returns {Promise<{sourceLang: string, targetLang: string, jobCount: number, tuCount: number}>}
     */
    async #bootstrapTask({ tmStore, srcLang, tgtLang }) {
        logInfo`Bootstrapping ${srcLang} → ${tgtLang} from ${tmStore.id}...`;
        const toc = await tmStore.getTOC(srcLang, tgtLang);
        const blockIds = Object.keys(toc.blocks);
        const jobIterator = tmStore.getTmBlocks(srcLang, tgtLang, blockIds);
        const tm = this.getTM(srcLang, tgtLang);
        const pairStats = await tm.bootstrap(jobIterator, tmStore.id);
        logInfo`  Loaded ${pairStats.jobCount} jobs, ${pairStats.tuCount} TUs into ${srcLang} → ${tgtLang} TU table`;
        return { sourceLang: srcLang, targetLang: tgtLang, ...pairStats };
    }

    /**
     * Bootstraps the TM database from a TM store.
     * This is a DESTRUCTIVE operation that wipes all existing TM data.
     *
     * @param {TMStore} tmStore - The TM store to bootstrap from.
     * @param {Object} options - Bootstrap options.
     * @param {boolean} [options.dryrun=false] - If true, only report what would be done.
     * @param {string} [options.sourceLang] - Filter to specific source language.
     * @param {string} [options.targetLang] - Filter to specific target language.
     * @param {number} [options.parallelism=4] - Number of parallel operations.
     * @returns {Promise<{pairs: Array<[string, string]>, stats?: Array<{sourceLang: string, targetLang: string, jobCount: number, tuCount: number}>, dryrun: boolean}>}
     */
    async bootstrap(tmStore, { dryrun = false, sourceLang, targetLang, parallelism = 4 } = {}) {
        // 1. Get language pairs from TM store
        /** @type {[string, string][]} */
        const pairs = sourceLang && targetLang ?
            /** @type {[string, string][]} */ ([[sourceLang, targetLang]]) :
            await tmStore.getAvailableLangPairs();

        if (dryrun) {
            return { pairs, dryrun: true };
        }

        logInfo`Bootstrap from ${tmStore.id} [parallelism: ${parallelism}]`;

        // 2. Run bootstrap in bootstrap mode (handles setup and cleanup)
        const stats = await this.#DAL.withBootstrapMode(async () => {
            this.#tmCache.clear();
            const bootstrapQueue = fastq.promise(this, this.#bootstrapTask, parallelism);
            const bootstrapPromises = pairs.map(([srcLang, tgtLang]) => bootstrapQueue.push({ tmStore, srcLang, tgtLang }));
            return await Promise.all(bootstrapPromises);
        });

        // Clear TM cache since we need new TM instances with the new connection
        this.#tmCache.clear();

        return { pairs, stats, dryrun: false };
    }
}
