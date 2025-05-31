import * as path from 'path';
import Database from 'better-sqlite3';
import { L10nContext, logVerbose } from '@l10nmonster/core';
import { SourceDAL } from './source.js';
import { TuDAL } from './tu.js';
import { JobDAL } from './job.js';

export default class DALManager {
    #sourceDBFilename;
    #tmDBFilename;
    #lazySourceDB;
    #lazyTmDB;
    #dalCache = new Map();

    constructor(sourceDB, tmDB) {
        this.#sourceDBFilename = sourceDB === undefined ? path.join(L10nContext.baseDir, 'l10nmonsterSource.db') : (sourceDB === false ? ':memory:' : sourceDB);
        this.#tmDBFilename = tmDB === undefined ? path.join(L10nContext.baseDir, 'l10nmonsterTM.db') : (tmDB === false ? ':memory:' : tmDB);
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
    }

    get #sourceDB() {
        if (!this.#lazySourceDB) {
            if (this.#sourceDBFilename === this.#tmDBFilename && this.#lazyTmDB) {
                this.#lazySourceDB = this.#lazyTmDB;
                logVerbose`Source DB initialized from TM DB`;
            } else {
                this.#lazySourceDB = new Database(this.#sourceDBFilename);
                // this.#lazySourceDB.pragma('journal_mode = WAL');
                logVerbose`Initialized Source DB (${this.#sourceDBFilename})`;
            }
        }
        const version = this.#lazySourceDB.prepare('select sqlite_version();').pluck().get();
        logVerbose`Running sqlite version ${version}`;
        return this.#lazySourceDB;
    }

    get #tmDB() {
        if (!this.#lazyTmDB) {
            if (this.#sourceDBFilename === this.#tmDBFilename && this.#lazySourceDB) {
                this.#lazyTmDB = this.#lazySourceDB;
                logVerbose`TM DB initialized from Source DB`;
            } else {
                this.#lazyTmDB = new Database(this.#tmDBFilename);
                // this.#lazyTmDB.pragma('journal_mode = WAL');
                this.#sourceDBFilename !== this.#tmDBFilename && this.#lazyTmDB.prepare('ATTACH ? as source;').run(this.#sourceDB.name);
                logVerbose`Initialized TM DB (${this.#tmDBFilename})`;
            }
        }
        return this.#lazyTmDB;
    }

    get source() {
        if (this.#dalCache.has('source')) {
            return this.#dalCache.get('source');
        }
        const dal = new SourceDAL(this.#sourceDB);
        this.#dalCache.set('source', dal);
        return dal;
    }

    tu(sourceLang, targetLang) {
        const pairKey = `${sourceLang}#${targetLang}`;
        if (this.#dalCache.has(pairKey)) {
            return this.#dalCache.get(pairKey);
        }
        const dal = new TuDAL(this.#tmDB, `tus_${sourceLang}_${targetLang}`.replace(/[^a-zA-Z0-9_]/g, '_'));
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

    get sourceTransaction() {
        return this.#sourceDB.transaction.bind(this.#sourceDB);
    }

    get tmTransaction() {
        return this.#tmDB.transaction.bind(this.#tmDB);
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
                if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
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
