import { logInfo, logVerbose } from '../../l10nContext.js';
import { utils } from '../index.js';

const statusPriority = { done: 1, pending: 2, req: 3 };
const legacyJobFilenameRegex = /(?<jobNameStub>[^/]+(?<translationProvider>[^_]+)_(?<sourceLang>[^_]+)_(?<targetLang>[^_]+)_job_(?<jobGuid>[0-9A-Za-z_-]+))-(?<status>req|pending|done)\.json$/;

/**
 * Adapter class to expose legacy job-based file stores as TM stores.
 * This class handles TM Blocks organized in legacy job files with status suffixes (req, pending, done).
 *
 * @class LegacyFileBasedTmStore
 * @property {string} partitioning - Determines how TM Blocks are partitioned ('job', 'provider', or 'language')
 *
 * @example
 * const store = new LegacyFileBasedTmStore({ delegate: fileDelegate, id: 'myStore', parallelism: 3 });
 */
export class LegacyFileBasedTmStore {
    id;
    parallelism;

    #files;

    get access() {
        return 'readonly';
    }

    get partitioning() {
        return 'job';
    }

    /**
     * Creates a LegacyFileBasedTmStore instance
     * @param {Object} options - Configuration options
     * @param {Object} options.delegate - Required file store delegate implementing file operations
     * @param {string} options.id - Required unique identifier for the store
     * @param {number} [options.parallelism=1] - Number of blocks to fetch in parallel
     * @throws {Error} If no delegate or id is provided
     */
    constructor(options) {
        const { delegate, id, parallelism = 1 } = options || {};
        if (!delegate || !id) {
            throw new Error('A delegate and an id are required to instantiate a LegacyFileBasedTmStore');
        }
        this.delegate = delegate;
        this.id = id;
        this.parallelism = Math.max(1, parallelism);
    }

    async #getAllFiles() {
        if (!this.#files) { // TODO: add a TTL logic in case this runs on a server
            this.#files = await this.delegate.listAllFiles();
        }
        return this.#files;
    }

    async getAvailableLangPairs() {
        const pairs = {};
        await this.delegate.ensureBaseDirExists();
        for (const [ fileName ] of await this.#getAllFiles()) {
            const jobFilenameParts = fileName.match(legacyJobFilenameRegex)?.groups;
            if (jobFilenameParts) {
                pairs[`${jobFilenameParts.sourceLang}#${jobFilenameParts.targetLang}`] ??= [ jobFilenameParts.sourceLang, jobFilenameParts.targetLang ];
            }
        }
        return Object.values(pairs);
    }

    async #listAllTmBlocksExtended(sourceLang, targetLang) {
        await this.delegate.ensureBaseDirExists();
        const files = await this.#getAllFiles();
        const handleMap = {};
        for (const [ fileName, modifiedAt ] of files) {
            const jobFilenameParts = fileName.match(legacyJobFilenameRegex)?.groups;
            if (jobFilenameParts && jobFilenameParts.sourceLang === sourceLang && jobFilenameParts.targetLang === targetLang) {
                const handle = handleMap[jobFilenameParts.jobNameStub] ?? {};
                if (!handle.status || statusPriority[handle.status] < statusPriority[jobFilenameParts.status]) {
                    handle.jobGuid = jobFilenameParts.jobGuid;
                    handle.status = jobFilenameParts.status;
                    handle.modifiedAt = modifiedAt;
                }
                handleMap[jobFilenameParts.jobNameStub] = handle;
            }
        }
        return Object.entries(handleMap).map(([ jobNameStub, handle ]) => [ jobNameStub, handle.jobGuid, handle.modifiedAt ]);
    }

    async listAllTmBlocks(sourceLang, targetLang) {
        // eslint-disable-next-line no-unused-vars
        return (await this.#listAllTmBlocksExtended(sourceLang, targetLang)).map(([ blockName, jobGuid, modified ]) => [ blockName, modified ]);
    }

    async #getTmBlock(blockName) {
        const [ jobRequest, jobResponse ] = await Promise.all([
            (async () => {
                try {
                    return JSON.parse(await this.delegate.getFile(`${blockName}-req.json`));
                // eslint-disable-next-line no-unused-vars
                } catch (e) {
                    logVerbose`No job request found for job: ${blockName}`;
                }
            })(),
            (async () => {
                try {
                    return JSON.parse(await this.delegate.getFile(`${blockName}-done.json`));
                // eslint-disable-next-line no-unused-vars
                } catch (e) {
                    try {
                        return JSON.parse(await this.delegate.getFile(`${blockName}-pending.json`));
                    // eslint-disable-next-line no-unused-vars
                    } catch (e) {
                        logVerbose`No job response found for job: ${blockName}`;
                    }
                }
            })(),
        ]);
        return [ jobRequest, jobResponse ];
    }

    async *getTmBlocks(sourceLang, targetLang, blockIds) {
        const toc = await this.getTOC(sourceLang, targetLang);
        
        // Helper function to fetch a single block
        const fetchBlock = async (blockId) => {
            const blockName = toc.blocks[blockId]?.blockName;
            if (blockName) {
                return await this.#getTmBlock(blockName);
            } else {
                logInfo`Block not found: ${blockId}`;
                return [null, null];
            }
        };

        // Process blocks in batches with controlled parallelism
        for (let i = 0; i < blockIds.length; i += this.parallelism) {
            const batch = blockIds.slice(i, i + this.parallelism);
            logVerbose`Fetching blocks: ${batch.join(', ')}`;
            const batchPromises = batch.map(blockId => fetchBlock(blockId));
            const batchResults = await Promise.all(batchPromises);
            
            // Yield results from this batch in order
            for (const [jobRequest, jobResponse] of batchResults) {
                yield* utils.getIteratorFromJobPair(jobRequest, jobResponse);
            }
        }
    }

    async getTOC(sourceLang, targetLang) {
        const toc = { v: 1, sourceLang, targetLang, blocks: {} };
        for (const [ blockName, jobGuid, modified ] of await this.#listAllTmBlocksExtended(sourceLang, targetLang)) {
            // we don't have the job.updatedAt timestamp, so we leave it undefined
            // the consquence is that we can't sync-down the store but can only import the whole thing
            toc.blocks[jobGuid] = { blockName, modified, jobs: [ [ jobGuid ] ] };
        }
        return toc;
    }

    async getWriter() {
        throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
    }
}
