import { logInfo, logVerbose, utils } from '@l10nmonster/core';

/**
 * Adapter class to expose LQABoss completion files as a TM store.
 *
 * @class LQABossTmStore
 */
export class LQABossTmStore {
    id;
    #storageDelegate;
    #tm;

    get access() {
        return 'readonly';
    }

    get partitioning() {
        return 'job';
    }

    /**
     * Creates an LQABossTmStore instance
     * @param {Object} options - Configuration options
     * @param {Object} options.delegate - Required file store delegate implementing file operations
     * @param {string} options.id - Required unique identifier for the store
     * @throws {Error} If no delegate or id is provided
     */
    constructor(options) {
        const { delegate, id } = options || {};
        if (!delegate || !id) {
            throw new Error('A delegate and an id are required to instantiate an LQABossTmStore');
        }
        this.#storageDelegate = delegate;
        this.id = id;
    }

    async #getTM() {
        if (!this.#tm) {
            this.#tm = {};
            const files = await this.#storageDelegate.listAllFiles();
            for (const [ fileName ] of files) {
                if (fileName.length === 26 && fileName.endsWith('.json')) {
                    const job = JSON.parse(await this.#storageDelegate.getFile(fileName));
                    !job.updatedAt && (job.updatedAt = '2025-08-29T21:29:36.269Z'); // workaround for old jobs that don't have an updatedAt
                    const ts = new Date(job.updatedAt).getTime();
                    job.tus = job.tus.map(tu => ({ ...tu, ts }));
                    this.#tm[job.sourceLang] ??= {};
                    this.#tm[job.sourceLang][job.targetLang] ??= {};
                    this.#tm[job.sourceLang][job.targetLang][job.jobGuid] = job;
                }
            }
        }
        return this.#tm;
    }

    async getAvailableLangPairs() {
        const tm = await this.#getTM();
        const pairs = [];
        for (const [ sourceLang, targets ] of Object.entries(tm)) {
            for (const targetLang of Object.keys(targets)) {
                pairs.push([ sourceLang, targetLang ]);
            }
        }
        return pairs;
    }

    async listAllTmBlocks(sourceLang, targetLang) {
        const tm = await this.#getTM();
        const blocks = tm[sourceLang]?.[targetLang] ?? {};
        return Object.entries(blocks).map(([ jobGuid, job ]) => [ jobGuid, job.updatedAt ]);
    }

    async *getTmBlocks(sourceLang, targetLang, blockIds) {
        const tm = await this.#getTM();
        const blocks = tm[sourceLang]?.[targetLang] ?? {};
        for (const jobGuid of blockIds) {
            const job = blocks[jobGuid];
            if (job) {
                yield* utils.getIteratorFromJobPair(job, job);
            }
        }
    }

    async getTOC(sourceLang, targetLang) {
        const tm = await this.#getTM();
        const blocks = tm[sourceLang]?.[targetLang] ?? {};
        const toc = { v: 1, sourceLang, targetLang, blocks: {} };
        for (const [ jobGuid, job ] of Object.entries(blocks)) {
            toc.blocks[jobGuid] = { blockName: jobGuid, modified: job.updatedAt, jobs: [ [ jobGuid, job.updatedAt ] ] };
        }
        return toc;
    }

    async getWriter() {
        throw new Error(`Cannot write to readonly TM Store: ${this.id}`);
    }
}
