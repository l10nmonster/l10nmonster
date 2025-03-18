import * as path from 'path';
import Database from 'better-sqlite3';
import { L10nContext } from '@l10nmonster/core';
import { SourceDAL } from './source.js';
import { TuDAL } from './tu.js';
import { JobDAL } from './job.js';

export default class DALManager {
    #lazySourceDB;
    #lazyTmDB;
    #dalCache = new Map();

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
    }

    get #sourceDB() {
        if (!this.#lazySourceDB) {
            const dbPath = path.join(L10nContext.baseDir, 'l10nmonsterSource.db');
            this.#lazySourceDB = new Database(dbPath);
            // this.#lazySourceDB.pragma('journal_mode = WAL');
            const version = this.#lazySourceDB.prepare('select sqlite_version();').pluck().get();
            L10nContext.logger.verbose(`Initialized Source DB with sqlite version ${version}`);
        }
        return this.#lazySourceDB;
    }

    get #tmDB() {
        if (!this.#lazyTmDB) {
            this.#lazyTmDB = new Database(path.join(L10nContext.baseDir, 'l10nmonsterTM.db'));
            // this.#lazyTmDB.pragma('journal_mode = WAL');
            const version = this.#lazyTmDB.prepare('select sqlite_version();').pluck().get();
            L10nContext.logger.verbose(`Initialized TM DB with sqlite version ${version}`);
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
