import * as path from 'path';
import Database from 'better-sqlite3';
import { getBaseDir, logVerbose } from '../l10nContext.js';
import { utils } from '../helpers/index.js';
import { ChannelDAL } from './channel.js';
import { TuDAL } from './tu.js';
import { JobDAL } from './job.js';

export default class SQLiteDALManager {
    #sourceDBFilename;
    #tmDBFilename;
    #lazySourceDB;
    #lazyTmDB;
    #dalCache = new Map();
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
                );
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
            if (this.#sourceDBFilename === this.#tmDBFilename && this.#lazySourceDB) {
                this.#lazyTmDB = this.#lazySourceDB;
                logVerbose`TM DB initialized from Source DB`;
            } else {
                this.#lazyTmDB = new Database(this.#tmDBFilename);
                this.#lazyTmDB.pragma('journal_mode = WAL');
                this.#sourceDBFilename !== this.#tmDBFilename && this.#lazyTmDB.prepare('ATTACH ? as source;').run(this.#sourceDB.name);
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
