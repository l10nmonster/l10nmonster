import * as fs from 'fs/promises';
import * as path from 'path';
import Database from 'better-sqlite3';
import { getBaseDir, logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { ChannelDAL } from './channel.js';
import { TuDAL } from './tu.js';
import { JobDAL } from './job.js';

/** @typedef {import('../interfaces.js').DALManager} DALManagerInterface */

/** @implements {DALManagerInterface} */
export default class SQLiteDALManager {
    #sourceDBFilename;
    #tmDBFilename;
    #lazySourceDB;
    #lazyTmDB;
    #dalCache = new Map();
    #bootstrapMode = false;
    activeChannels;

    constructor(sourceDB, tmDB) {
        this.#sourceDBFilename = sourceDB === undefined ? path.join(getBaseDir(), 'l10nmonsterSource.db') : (sourceDB === false ? ':memory:' : sourceDB);
        this.#tmDBFilename = tmDB === undefined ? path.join(getBaseDir(), 'l10nmonsterTM.db') : (tmDB === false ? ':memory:' : tmDB);
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
        this.activeChannels = new Set(mm.rm.channelIds);
    }

    get #sourceDB() {
        if (!this.#lazySourceDB) {
            if (this.#sourceDBFilename === this.#tmDBFilename && this.#lazyTmDB) {
                this.#lazySourceDB = this.#lazyTmDB;
                logVerbose`Source DB initialized from TM DB`;
            } else {
                this.#lazySourceDB = new Database(this.#sourceDBFilename);
                this.#lazySourceDB.pragma('journal_mode = WAL');
                this.#lazySourceDB.pragma('synchronous = OFF');
                this.#lazySourceDB.pragma('temp_store = MEMORY');
                this.#lazySourceDB.pragma('cache_size = -500000');
                this.#lazySourceDB.pragma('threads = 4');
                const version = this.#lazySourceDB.prepare('select sqlite_version();').pluck().get();
                logVerbose`Initialized Source DB (${this.#sourceDBFilename}) with sqlite version ${version}`;
            }
            // store -- id if channel populated from a store
            // ts -- milliseconds of last snap or ts of store used for importing
            this.#lazySourceDB.exec(/* sql */`
                CREATE TABLE IF NOT EXISTS channel_toc (
                    channel TEXT NOT NULL,
                    store TEXT,
                    ts INTEGER,
                    resources INTEGER,
                    segments INTEGER,
                    PRIMARY KEY (channel)
                ) WITHOUT ROWID;
            `);
            this.#lazySourceDB.function(
                'flattenNormalizedSourceToOrdinal',
                { deterministic: true },
                nstr => {
                    if (nstr === null || nstr === undefined) return null;
                    const parsed = JSON.parse(nstr);
                    if (!Array.isArray(parsed)) return null;
                    return utils.flattenNormalizedSourceToOrdinal(parsed);
                }
            );
        }
        return this.#lazySourceDB;
    }

    get #tmDB() {
        if (!this.#lazyTmDB) {
            if (this.#sourceDBFilename === this.#tmDBFilename && this.#lazySourceDB && !this.#bootstrapMode) {
                this.#lazyTmDB = this.#lazySourceDB;
                logVerbose`TM DB initialized from Source DB`;
            } else {
                this.#lazyTmDB = new Database(this.#tmDBFilename);
                const journalMode = this.#bootstrapMode ? 'MEMORY' : 'WAL';
                this.#lazyTmDB.pragma(`journal_mode = ${journalMode}`);
                logVerbose`Set journal_mode to ${this.#lazyTmDB.pragma('journal_mode', { simple: true })}`;
                this.#lazyTmDB.pragma('synchronous = OFF');
                this.#lazyTmDB.pragma('temp_store = MEMORY');
                this.#lazyTmDB.pragma('cache_size = -500000');
                this.#lazyTmDB.pragma('threads = 4');
                if (this.#sourceDBFilename !== this.#tmDBFilename) {
                    this.#lazyTmDB.prepare('ATTACH ? as source;').run(this.#sourceDB.name);
                }
                const version = this.#lazyTmDB.prepare('select sqlite_version();').pluck().get();
                logVerbose`Initialized TM DB (${this.#tmDBFilename}) with sqlite version ${version}`;
            }
        }
        return this.#lazyTmDB;
    }

    channel(channelId) {
        if (!this.activeChannels.has(channelId)) {
            throw new Error(`Invalid channel reference: ${channelId}`);
        }
        if (this.#dalCache.has(channelId)) {
            return this.#dalCache.get(channelId);
        }
        const dal = new ChannelDAL(this.#sourceDB, channelId);
        this.#dalCache.set(channelId, dal);
        return dal;
    }

    tu(sourceLang, targetLang) {
        // eslint-disable-next-line no-unused-vars
        const jobDAL = this.job; // need to make sure job DAL is initialized first because it's used by the TU DAL
        const pairKey = `${sourceLang}#${targetLang}`;
        if (this.#dalCache.has(pairKey)) {
            return this.#dalCache.get(pairKey);
        }
        const dal = new TuDAL(this.#tmDB, sourceLang, targetLang, this);
        this.#dalCache.set(pairKey, dal);
        return dal;
    }

    get job() {
        if (this.#dalCache.has('job')) {
            return this.#dalCache.get('job');
        }
        const dal = new JobDAL(this.#tmDB);
        this.#dalCache.set('job', dal);
        return dal;
    }

    /**
     * Runs a callback in bootstrap mode with optimal bulk insert settings.
     * Automatically cleans up and switches back to normal WAL mode when done.
     *
     * @template T
     * @param {() => Promise<T>} callback - The bootstrap operation to run.
     * @returns {Promise<T>} The result of the callback.
     */
    async withBootstrapMode(callback) {
        // Close existing connection
        if (this.#lazyTmDB) {
            this.#lazyTmDB.close();
            this.#lazyTmDB = null;
        }
        // Delete TM database files
        if (this.#tmDBFilename !== ':memory:') {
            await fs.unlink(this.#tmDBFilename).catch(() => {});
            await fs.unlink(`${this.#tmDBFilename}-wal`).catch(() => {});
            await fs.unlink(`${this.#tmDBFilename}-shm`).catch(() => {});
        }
        this.#dalCache.clear();
        // Set bootstrap mode BEFORE accessing #tmDB so getter uses MEMORY journal
        this.#bootstrapMode = true;
        // Access #tmDB to trigger lazy initialization with MEMORY mode
        this.#tmDB;

        try {
            return await callback();
        } finally {
            // Switch to WAL mode (MEMORY -> WAL should work without locking issues)
            this.#lazyTmDB.pragma('journal_mode = WAL');
            logVerbose`Set journal_mode to ${this.#lazyTmDB.pragma('journal_mode', { simple: true })}`;
            this.#bootstrapMode = false;
        }
    }

    async shutdown() {
        if (this.#lazySourceDB) {
            this.#lazySourceDB.close();
        }
        if (this.#lazyTmDB) {
            this.#lazyTmDB.close();
        }
    }
}

export function createSQLObjectTransformer(jsonProps, spreadingProps = []) {
    return {
        encode(obj) {
            for (const key of jsonProps) {
                if (Object.hasOwn(obj, key) && typeof obj[key] === 'object' && obj[key] !== null) {
                    obj[key] = JSON.stringify(obj[key]);
                }
            }
            return obj;
        },
        decode(obj) {
            Object.entries(obj).forEach(([ key, value]) => {
                if (value === null) {
                    delete obj[key];
                } else {
                    if (jsonProps.includes(key)) {
                        try {
                            const parsed = JSON.parse(value);
                            if (spreadingProps.includes(key) && typeof parsed === 'object') {
                                delete obj[key];
                                Object.assign(obj, parsed);
                            } else {
                                obj[key] = parsed;
                            }
                        } catch (e) {
                            throw new Error(`Failed to parse JSON for key ${key}: ${obj[key]} -- ${e.message}`);
                        }
                    }
                }
            });
            return obj;
        }
    };
}
