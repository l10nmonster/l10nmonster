import { logVerbose, logWarn } from '../l10nContext.js';
import { utils, analyzers } from '../helpers/index.js';
import * as opsManager from '../opsManager/index.js';
import DALManager from '../DAL/index.js';
import TMManager from '../tmManager/index.js';
import ResourceManager from '../resourceManager/index.js';
import Dispatcher from './dispatcher.js';
import { analyzeCmd } from './analyze.js';

/**
 * @typedef {object} L10nMonsterConfig
 * @property {object} [channels] - Channel configurations where each channel has a createChannel() method
 * @property {boolean} [autoSnap] - Whether to automatically create snapshots
 * @property {object} [tmStores] - TM stores instances
 * @property {object} [opsStore] - Operations store instance
 * @property {boolean} [saveFailedJobs] - Whether to save failed jobs (requires opsStore)
 * @property {Array} [providers] - Array of translation providers
 * @property {object} [analyzers] - Additional analyzers to merge with default analyzers
 * @property {Array} [actions] - Array of actions to merge with default actions
 * @property {string|boolean} [sourceDB] - Filename for the source database
 * @property {string|boolean} [tmDB] - Filename for the translation memory database
 * @property {Intl.NumberFormat} [currencyFormatter] - Custom currency formatter
 * @property {Function} [init] - Optional initialization function called during init()
 */

export class MonsterManager {
    #dalManager;
    #tmStores = {};
    #configInitializer;
    #functionsForShutdown = [];
    saveFailedJobs = false;

    /**
     * @param {L10nMonsterConfig} monsterConfig - Configuration object for the MonsterManager
     */
    constructor(monsterConfig) {
        this.#configInitializer = monsterConfig.init?.bind(monsterConfig);

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

        const createHandler = action => (opts => action(this, opts ?? {}));
        const flattenedActions = [];
        for (const action of monsterConfig.actions) {
            if (action.subActions) {
                action.subActions.forEach(subAction => flattenedActions.push([ subAction.name, createHandler(subAction.action) ]));
            } else {
                flattenedActions.push([ action.name, createHandler(action.action) ]);
            }
        }
        this.l10n = Object.fromEntries(flattenedActions);
        logVerbose`Registered actions: ${flattenedActions.map(e => e[0]).join(', ')}`;

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
        typeof this.#configInitializer === 'function' && await this.#configInitializer(this);
        logVerbose`MonsterManager initialized!`;
    }

        /**
     * Runs the localization process with the given global options and callback.
     * @param {L10nMonsterConfig} monsterConfig - The configuration object for the MonsterManager
     * @param {Function} cb - The callback function to execute after initialization.
     * @returns {Promise} Returns a promise that resolves with the response from the callback.
     * @throws {string} Throws an error if the localization process fails.
     */
    static async run(monsterConfig, cb) {
        try {
            const mm = new MonsterManager(monsterConfig);
            await mm.init();
            let response, error;
            try {
                response = await cb(mm);
            } catch(e) {
                error = e;
            } finally {
                mm && (await mm.shutdown());
            }
            if (error) {
                throw error;
            }
            return response;
        } catch(e) {
            e.message && (e.message = `Unable to run L10nMonsterConfig: ${e.message}`);
            throw e;
        }
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
