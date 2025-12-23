import path from 'path';
import { getBaseDir } from '../../l10nContext.js';
import { FsStoreDelegate } from './fsStoreDelegate.js';
import { LegacyFileBasedTmStore } from './legacyFileBasedTmStore.js';
import { BaseJsonlTmStore } from './baseJsonlTmStore.js';

/**
 * Filesystem-based legacy JSON TM store.
 * @extends LegacyFileBasedTmStore
 */
export class FsLegacyJsonTmStore extends LegacyFileBasedTmStore {

    /**
     * Creates an FsLegacyJsonTmStore instance.
     * @param {Object} options - Configuration options.
     * @param {string} options.jobsDir - Directory path for jobs storage.
     * @param {string} options.id - Unique identifier for the store.
     * @param {number} [options.parallelism] - Number of blocks to fetch in parallel.
     */
    constructor({ jobsDir, id, parallelism }) {
        super({
            delegate: new FsStoreDelegate(path.join(getBaseDir(), jobsDir)),
            id,
            parallelism
        });
    }
}

/**
 * Filesystem-based JSONL TM store.
 * @extends BaseJsonlTmStore
 */
export class FsJsonlTmStore extends BaseJsonlTmStore {

    /**
     * Creates an FsJsonlTmStore instance.
     * @param {Object} options - Configuration options.
     * @param {string} options.jobsDir - Directory path for jobs storage.
     * @param {string} options.id - The logical id of the instance.
     * @param {'readwrite' | 'readonly' | 'writeonly'} [options.access] - Store access permissions.
     * @param {'job' | 'provider' | 'language'} [options.partitioning] - Partitioning strategy.
     * @param {boolean} [options.compressBlocks] - Use Gzip compression.
     */
    constructor(options) {
        super(new FsStoreDelegate(path.join(getBaseDir(), options.jobsDir)), options);
    }
}
