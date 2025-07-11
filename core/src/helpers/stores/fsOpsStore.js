import readline from 'node:readline/promises';
import { Readable } from 'node:stream';
import { FsStoreDelegate } from './fsStoreDelegate.js';

export class OpsStore {
    #storeDelegate;

    constructor(storeDelegate) {
        this.#storeDelegate = storeDelegate;
    }

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

    async *getTask(taskName) {
        const filename = `${taskName}.jsonl`;
        const reader = this.#storeDelegate.getStream(filename);
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

export class FsOpsStore extends OpsStore {
    constructor(opsDir) {
        const storeDelegate = new FsStoreDelegate(opsDir);
        // Ensure the directory exists
        storeDelegate.ensureBaseDirExists();
        super(storeDelegate);
    }
}
