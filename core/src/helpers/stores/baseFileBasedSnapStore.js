import readline from 'node:readline/promises';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

import { logInfo, logVerbose } from '../../l10nContext.js';

class JsonlFormat {
    constructor(compress) {
        this.compress = Boolean(compress);
        this.suffix = this.compress ? '.jsonl.gz' : '.jsonl';
    }

    createSerializer(generator, stats) {
        stats.count = 0;
        const serializedRowGenerator = async function *jsonlGenerator() {
            for await (const row of generator) {
                stats.count++;
                // eslint-disable-next-line prefer-template
                yield JSON.stringify(row) + '\n';
            }
        };
        let readable = Readable.from(serializedRowGenerator());
        if (this.compress) {
            readable = readable.pipe(zlib.createGzip());
        }
        return readable;
    }
}

/**
 * New Snap Store using a single file per channel streaming JSONL and PARQUET formats.
 *
 * @class BaseFileBasedSnapStore
 *
 */
export class BaseFileBasedSnapStore {
    id;
    #format;
    #snapFilenameRegex;

    /**
     * Creates a BaseFileBasedSnapStore instance
     * @param {Object} delegate - Required file store delegate implementing file operations
     * @param {Object} options - Base store options
     * @param {string} options.id - The logical id of the instance
     * @param {string} [options.format] - The format of the snap files (jsonl, gzip)
     * @throws {Error} If no delegate is provided
     */
    constructor(delegate, options) {
        if (!delegate || !options.id) {
            throw new Error(`A delegate and a id are required to instantiate a BaseFileBasedSnapStore`);
        }
        this.delegate = delegate;
        this.id = options.id;
        if (options.format === 'gzip') {
            this.#format = new JsonlFormat(true);
        } else if (options.format === 'jsonl') {
            this.#format = new JsonlFormat(false);
        } else {
            throw new Error(`BaseFileBasedSnapStore: Unknown format "${options.format}"`);
        }
        const regexSuffix = this.#format.suffix.replace('.', '\\.');
        this.#snapFilenameRegex = new RegExp(`ch=(?<channel>[^/]+)/ts=(?<ts>[0-9]+)/(?<table>segments|resources)${regexSuffix}$`);
    }

    #getSnapFileName(ts, channelId, table) {
        return `ch=${channelId}/ts=${ts}/${table}${this.#format.suffix}`;
    }

    async getTOC() {
        await this.delegate.ensureBaseDirExists();
        const filesByChannelTs = {};
        const files = await this.delegate.listAllFiles();
        for (const [ fileName ] of files) {
            const match = fileName.match(this.#snapFilenameRegex);
            if (match) {
                const { ts, channel, table } = match.groups;
                const key = `${channel}:${ts}`;
                filesByChannelTs[key] ??= { channel, ts: parseInt(ts, 10), tables: new Set() };
                filesByChannelTs[key].tables.add(table);
            }
        }
        // Only include timestamps where both resources and segments files exist
        let TOC = {};
        for (const { channel, ts, tables } of Object.values(filesByChannelTs)) {
            if (tables.has('resources') && tables.has('segments')) {
                TOC[channel] ??= [];
                TOC[channel].push(ts);
            }
        }
        Object.keys(TOC).forEach(channel => {
            TOC[channel].sort((a, b) => b - a);
        });
        return TOC;
    }

    async *generateRows(ts, channelId, table) {
        const snapFileName = this.#getSnapFileName(ts, channelId, table);
        let reader = await this.delegate.getStream(snapFileName);
        if (this.#format.compress) {
            reader = reader.pipe(zlib.createGunzip());
        }
        const rl = readline.createInterface({
            input: reader,
            crlfDelay: Infinity,
            terminal: false,
        });

        for await (const line of rl) {
            yield JSON.parse(line);
        }
        rl.close();
    }

    async saveSnap(ts, channelId, rowGenerator, table) {
        logInfo`Saving snap(${table}) for channel ${channelId} into snap store ${this.id}...`;
        const stats = {};
        await this.delegate.saveStream(this.#getSnapFileName(ts, channelId, table), this.#format.createSerializer(rowGenerator, stats));
        logVerbose`Saved ${stats.count} ${[stats.count, 'row', 'rows']} from table ${table} in channel ${channelId} into snap store ${this.id} ts=${ts}`;
        return stats;
    }
}
