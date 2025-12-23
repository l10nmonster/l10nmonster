import readline from 'node:readline/promises';
import { Readable } from 'node:stream';
import { FsStoreDelegate } from './fsStoreDelegate.js';

/**
 * @typedef {import('../../interfaces.js').OpsStoreInterface} OpsStoreInterface
 * @typedef {import('../../interfaces.js').FileStoreDelegate} _FileStoreDelegate
 * @typedef {import('../../interfaces.js').SerializedOp} SerializedOp
 */

/**
 * Base operations store for storing and retrieving task operations.
 * @implements {OpsStoreInterface}
 */
export class OpsStore {

    /** @type {_FileStoreDelegate} */
    #storeDelegate;

    /**
     * Creates an OpsStore instance.
     * @param {_FileStoreDelegate} storeDelegate - File store delegate for storage operations.
     */
    constructor(storeDelegate) {
        this.#storeDelegate = storeDelegate;
    }

    /**
     * Saves operations for a task.
     * @param {string} taskName - Name/ID of the task.
     * @param {SerializedOp[]} opList - List of serialized operations to save.
     * @returns {Promise<void>}
     */
    async saveOps(taskName, opList) {
        const filename = `${taskName}.jsonl`;
        const generator = function *jsonlGenerator () {
            for (const op of opList) {
                // eslint-disable-next-line prefer-template
                yield JSON.stringify(op) + '\n';
            }
        };
        const readable = Readable.from(generator());
        await this.#storeDelegate.saveStream(filename, readable);
    }

    /**
     * Gets operations for a task.
     * @param {string} taskName - Name/ID of the task.
     * @returns {AsyncGenerator<SerializedOp>} Async generator of serialized operation objects.
     */
    async *getTask(taskName) {
        const filename = `${taskName}.jsonl`;
        const reader = await this.#storeDelegate.getStream(filename);
        const rl = readline.createInterface({
            input: reader,
            crlfDelay: Infinity,
            terminal: false,
        });
        for await (const line of rl) {
            yield JSON.parse(line);
        }
    }
}

/**
 * Filesystem-based operations store.
 * @extends OpsStore
 */
export class FsOpsStore extends OpsStore {

    /**
     * Creates an FsOpsStore instance.
     * @param {string} opsDir - Directory path for storing operations.
     */
    constructor(opsDir) {
        const storeDelegate = new FsStoreDelegate(opsDir);
        // Ensure the directory exists
        storeDelegate.ensureBaseDirExists();
        super(storeDelegate);
    }
}
