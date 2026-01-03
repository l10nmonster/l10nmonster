import { corePackageVersion, logVerbose, logWarn, dumpLogs, logError } from '../l10nContext.js';
import { analyzers } from '../helpers/index.js';
import * as opsManager from '../opsManager/index.js';
import SQLiteDALManager from '../DAL/index.js';
import TMManager from '../tmManager/index.js';
import ResourceManager from '../resourceManager/index.js';
import Dispatcher from './dispatcher.js';
import { analyzeCmd } from './analyze.js';

/**
 * @typedef {import('../interfaces.js').TranslationProvider} TranslationProvider
 * @typedef {import('../interfaces.js').L10nAction} L10nAction
 */

/**
 * @typedef {object} L10nMonsterConfig
 * @property {object} [channels] - Channel configurations where each channel has a createChannel() method
 * @property {boolean} [autoSnap] - Whether to automatically create snapshots
 * @property {object} [snapStores] - Snap stores instances
 * @property {object} [tmStores] - TM stores instances
 * @property {object} [opsStore] - Operations store instance
 * @property {boolean} [saveFailedJobs] - Whether to save failed jobs (requires opsStore)
 * @property {TranslationProvider[]} [providers] - Array of translation providers
 * @property {object} [analyzers] - Additional analyzers to merge with default analyzers
 * @property {L10nAction[]} [actions] - Array of actions to merge with default actions
 * @property {string|boolean} [sourceDB] - Legacy: Filename for the source database
 * @property {string|boolean} [tmDB] - Legacy: Filename for the translation memory database
 * @property {import('../interfaces.js').DALManager} [dalManagerInstance] - Custom DAL Manager instance
 * @property {Intl.NumberFormat} [currencyFormatter] - Custom currency formatter
 * @property {Function} [init] - Optional initialization function called during init()
 */

/**
 * @typedef {import('../interfaces.js').Analyzer} Analyzer
 */

export class MonsterManager {
    #dalManager;
    #configInitializer;
    #functionsForShutdown = [];
    saveFailedJobs = false;

    /** @type {Record<string, (opts?: Record<string, unknown>) => Promise<unknown>>} */
    l10n;

    /** @type {Record<string, new (...args: unknown[]) => Analyzer>} */
    analyzers;

    /**
     * @param {L10nMonsterConfig} monsterConfig - Configuration object for the MonsterManager
     */
    constructor(monsterConfig) {
        this.#configInitializer = monsterConfig.init?.bind(monsterConfig);

        if (monsterConfig.dalManagerInstance) {
            this.#dalManager = monsterConfig.dalManagerInstance;
        } else {
            // Legacy support: convert old sourceDB/tmDB to new format
            // sourceDB/tmDB can be: undefined (default), false (in-memory), true (default), or string (custom path)
            const sourceFilename = monsterConfig.sourceDB === false ?
undefined :
                (typeof monsterConfig.sourceDB === 'string' ? monsterConfig.sourceDB : 'l10nmonsterSource.db');
            const tmFilename = monsterConfig.tmDB === false ?
undefined :
                (typeof monsterConfig.tmDB === 'string' ? monsterConfig.tmDB : 'l10nmonsterTM.db');
            this.#dalManager = new SQLiteDALManager({ sourceFilename, tmFilename });
        }

        let channels;
        if (typeof monsterConfig.channels === 'object') {
            channels = Object.fromEntries(Object.entries(monsterConfig.channels).map(([id, channel]) => [ id, channel.createChannel() ]));
        }
        this.rm = new ResourceManager(this.#dalManager, { channels, autoSnap: monsterConfig.autoSnap, snapStores: monsterConfig.snapStores });

        this.tmm = new TMManager(this.#dalManager, monsterConfig.tmStores);

        if (monsterConfig.opsStore) {
            opsManager.setOpsStore(monsterConfig.opsStore);
            this.saveFailedJobs = monsterConfig.saveFailedJobs;
        } else {
            monsterConfig.saveFailedJobs && logWarn`saveFailedJobs is set but no opsStore is configured -- ignoring`;
        }

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
    }

    async init() {
        await this.#dalManager.init(this);
        await this.tmm.init(this);
        await this.dispatcher.init(this);
        await this.rm.init(this);
        typeof this.#configInitializer === 'function' && await this.#configInitializer(this);
        logVerbose`MonsterManager version ${corePackageVersion} initialized!`;
    }

        /**
     * Runs the localization process with the given global options and callback.
     * @param {L10nMonsterConfig} monsterConfig - The configuration object for the MonsterManager
     * @param {Function} cb - The callback function to execute after initialization.
     * @returns {Promise} Returns a promise that resolves with the response from the callback.
     * @throws {string} Throws an error if the localization process fails.
     */
    static async run(monsterConfig, cb) {
        let mm;
        let signalHandler;
        try {
            mm = new MonsterManager(monsterConfig);
            await mm.init();

            // Register signal handlers for graceful shutdown
            signalHandler = async (signal) => {
                logVerbose`Received ${signal}, shutting down...`;
                await mm.shutdown();
                process.exit(0);
            };
            process.on('SIGINT', signalHandler);
            process.on('SIGTERM', signalHandler);

            return await cb(mm);
        } catch(e) {
            logError`Exception thrown while running L10nMonsterConfig: ${e.stack ?? e.message}`;
            e.message && (e.message = `Unable to run L10nMonsterConfig: ${e.message}`);
            const logFilePath = dumpLogs();
            e.message = `${e.message}\n\nA complete log of this run can be found in: ${logFilePath}`;
            throw e;
        } finally {
            // Remove signal handlers
            if (signalHandler) {
                process.off('SIGINT', signalHandler);
                process.off('SIGTERM', signalHandler);
            }
            mm && (await mm.shutdown());
        }
    }
    
    /**
     * Registers an async function to be called during shutdown.
     * @param {() => Promise<void>} func - Async cleanup function.
     */
    scheduleForShutdown(func) {
        this.#functionsForShutdown.push(func);
    }

    /**
     * Runs an analyzer on source content or translation memory.
     * @param {string | import('../interfaces.js').Analyzer} analyzer - Analyzer name or Analyzer class.
     * @param {string[]} [params] - Parameters passed to the analyzer constructor.
     * @param {string} [limitToLang] - Optional language code to limit TM analysis.
     * @returns {Promise<import('../interfaces.js').AnalysisResult>} Analysis results.
     */
    async analyze(analyzer, params, limitToLang) {
        return await analyzeCmd(this, analyzer, params, limitToLang);
    }

    /**
     * Gets translation status for specified channels.
     * @param {string | string[] | undefined} [channels] - Channel ID, array of IDs, or undefined for all channels.
     * @returns {Promise<Record<string, Record<string, Record<string, Record<string, {
     *   translatedDetails: Array<{minQ: number; q: number; res: number; seg: number; words: number; chars: number}>;
     *   untranslatedDetails: Record<string, Array<{minQ: number; seg: number; words: number; chars: number}>>;
     *   pairSummary: {segs: number; words: number; chars: number};
     *   pairSummaryByStatus: {translated: number; 'low quality': number; 'in flight': number; untranslated: number};
     * }>>>>>} Translation status by channel/source/target/project.
     */
    async getTranslationStatus(channels) {
        const channelIds = Array.isArray(channels) ? channels : (typeof channels === 'string' ? [ channels ] : this.rm.channelIds);

        /** @type {Record<string, Record<string, Record<string, Record<string, any>>>>} */
        const translationStatusByPair = {};
        for (const channelId of channelIds) {
            translationStatusByPair[channelId] ??= {};
            const langPairs = await this.rm.getDesiredLangPairs(channelId);
            for (const [ sourceLang, targetLang ] of langPairs) {
                translationStatusByPair[channelId][sourceLang] ??= {};
                translationStatusByPair[channelId][sourceLang][targetLang] ??= {};
                const tm = this.tmm.getTM(sourceLang, targetLang);
                const translatedStatus = await tm.getTranslatedContentStatus(channelId);
                const untranslatedStatus = await tm.getUntranslatedContentStatus(channelId);

                // Get all unique project names from both results
                const allProjects = new Set([...Object.keys(translatedStatus), ...Object.keys(untranslatedStatus)]);

                for (const prj of allProjects) {
                    const translatedDetails = translatedStatus[prj] || [];
                    const untranslatedDetails = untranslatedStatus[prj] || {};
                    const pairSummary = { segs: 0, words: 0, chars: 0 };
                    const pairSummaryByStatus = { translated: 0, 'low quality': 0, 'in flight': 0, untranslated: 0 };

                    // Process translated content
                    for (const { minQ, q, seg, words, chars } of translatedDetails) {
                        pairSummary.segs += seg;
                        pairSummaryByStatus[q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality')] += seg;
                        pairSummary.words += words;
                        pairSummary.chars += chars;
                    }

                    // Process untranslated content (nested by group)
                    for (const groupDetails of Object.values(untranslatedDetails)) {
                        for (const { seg, words, chars } of groupDetails) {
                            pairSummary.segs += seg;
                            pairSummaryByStatus.untranslated += seg;
                            pairSummary.words += words;
                            pairSummary.chars += chars;
                        }
                    }

                    translationStatusByPair[channelId][sourceLang][targetLang][prj] = {
                        translatedDetails,
                        untranslatedDetails,
                        pairSummary,
                        pairSummaryByStatus
                    };
                }
                // logVerbose`Got active content translation status for ${sourceLang} → ${targetLang}`;
            }
        }
        return translationStatusByPair;
    }

    async shutdown() {
        for (const func of this.#functionsForShutdown) {
            await func();
        }
    }
}
