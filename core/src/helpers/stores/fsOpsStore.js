import * as path from 'path';
import { existsSync, mkdirSync, createReadStream, createWriteStream } from 'fs';
import readline from 'node:readline/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export class FsOpsStore {
    #opsDir;

    constructor(opsDir) {
        this.#opsDir = opsDir;
        if (!existsSync(opsDir)) {
            mkdirSync(opsDir, {recursive: true});
        }
    }

    async saveOps(taskName, opList) {
        const fullPath = path.join(this.#opsDir, `${taskName}.jsonl`);
        const generator = function *jsonlGenerator () {
            for (const op of opList) {
                // eslint-disable-next-line prefer-template
                yield JSON.stringify(op) + '\n';
            }
        };
        const readable = Readable.from(generator());
        const writable = createWriteStream(fullPath);
        await pipeline(readable, writable);
    }

    async *getTask(taskName) {
        const fullPath = path.join(this.#opsDir, `${taskName}.jsonl`);
        const reader = createReadStream(fullPath);
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
