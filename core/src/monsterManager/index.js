import * as path from 'path';
import { L10nContext, utils, analyzers, opsManager, logVerbose, logWarn } from '@l10nmonster/core';
import DALManager from '../DAL/index.js';
import TMManager from '../tmManager/index.js';
import ResourceManager from '../resourceManager/index.js';
import Dispatcher from './dispatcher.js';
import { analyzeCmd } from './analyze.js';

export class MonsterManager {
    #dalManager;
    #tmStores = {};
    #functionsForShutdown = [];
    saveFailedJobs = false;

    constructor(monsterConfig) {
        this.monsterConfig = monsterConfig;

        this.#dalManager = new DALManager(monsterConfig.sourceDB, monsterConfig.tmDB);

        let channels;
        if (typeof monsterConfig.channels === 'object') {
            channels = Object.fromEntries(Object.entries(monsterConfig.channels).map(([id, channel]) => [ id, channel.createChannel() ]));
        }
        this.rm = new ResourceManager(this.#dalManager, { channels, autoSnap: monsterConfig.autoSnap });

        monsterConfig.tmStores && (this.#tmStores = monsterConfig.tmStores);

        if (monsterConfig.opsStore) {
            opsManager.setOpsStore(monsterConfig.opsStore);
            this.saveFailedJobs = monsterConfig.saveFailedJobs;
        } else {
            monsterConfig.saveFailedJobs && logWarn`saveFailedJobs is set but no opsStore is configured -- ignoring`;
        }

        this.tmm = new TMManager(this.#dalManager);

        this.dispatcher = new Dispatcher(monsterConfig.providers);

        this.analyzers = { ...analyzers, ...monsterConfig.analyzers };
        this.currencyFormatter = monsterConfig.currencyFormatter || new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

        // generated info
        this.capabilitiesByChannel = Object.fromEntries(Object.entries(monsterConfig.channels).map(([type, channel]) => [ type, {
            snap: Boolean(channel.source),
            status: Boolean(channel.source),
            push: Boolean(channel.source && monsterConfig.providers.length > 0),
            update: Boolean(monsterConfig.providers.length > 0),
            translate: Boolean(channel.source && channel.target),
        }]));
    }

    async init() {
        await this.#dalManager.init(this);
        for (const tmStore of Object.values(this.#tmStores)) {
            typeof tmStore.init === 'function' && await tmStore.init(this);
        }
        await this.tmm.init(this);
        await this.dispatcher.init(this);
        await this.rm.init(this);
        typeof this.monsterConfig.init === 'function' && await this.monsterConfig.init(this);
        L10nContext.logger.verbose(`MonsterManager initialized!`);
    }

    // register an async function to be called during shutdown
    scheduleForShutdown(func) {
        this.#functionsForShutdown.push(func);
    }

    async analyze(analyzer, params, limitToLang) {
        return await analyzeCmd(this, analyzer, params, limitToLang);
    }

    /**
     * @param {Array | string} limitToLang Language or list of languages to limit to
     */
    async getTargetLangs(limitToLang = []) {
        const desiredTargetLangs = new Set((await this.rm.getAvailableLangPairs()).map(pair => pair[1]));
        const langsToLimit = Array.isArray(limitToLang) ? limitToLang : limitToLang.split(',');
        langsToLimit.forEach(limitedLang => {
            if (!desiredTargetLangs.has(limitedLang)) {
                throw new Error(`Invalid language: ${limitedLang}`);
            }
        });
        return [ ...desiredTargetLangs ].filter(lang => limitToLang.length === 0 || langsToLimit.includes(lang)).sort();
    }

    async getTranslationStatus() {
        const translationStatusByPair = {};
        const langPairs = await this.rm.getAvailableLangPairs();
        for (const [ sourceLang, targetLang ] of langPairs) {
            translationStatusByPair[sourceLang] ??= {};
            const tm = this.tmm.getTM(sourceLang, targetLang);
            translationStatusByPair[sourceLang][targetLang] = tm.getActiveContentTranslationStatus();
            logVerbose`Got active content translation status for ${sourceLang} → ${targetLang}`;
        }
        return translationStatusByPair;
    }

    getTmStore(id) {
        const fixedId = utils.fixCaseInsensitiveKey(this.#tmStores, id);
        if (fixedId) {
            return this.#tmStores[fixedId];
        } else {
            throw new Error(`Unknown tm store: ${id}`);
        }
    }

    getTmStoreIds() {
        return Object.keys(this.#tmStores);
    }

    async shutdown() {
        for (const func of this.#functionsForShutdown) {
            await func();
        }
    }
}
