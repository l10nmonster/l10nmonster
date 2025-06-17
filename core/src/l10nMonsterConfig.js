import { L10nContext, MonsterManager, actions } from '@l10nmonster/core';
import { Channel } from './entities/channel.js';
import { Normalizer } from './entities/normalizer.js';
import { FormatHandler } from './entities/formatHandler.js';
import { validate } from './helpers/utils.js';

export class ResourceFormatConfig {

    /**
     * @type {Object} FormatHandlerConfig
     * @property {string} id - Unique identifier for this format handler.
     * @property {Object} resourceFilter - A resource filter to parse raw content.
     * @property {string} [defaultMessageFormat] - The default message format for this format handler.
     * @property {Function[]} [segmentDecorators] - An array of functions that decorate the segments.
     */
    #config = {};


    constructor(id) {
        if (!id) {
            throw new Error('Resource Format id is required');
        }
        this.#config.id = id;
        this.#config.defaultMessageFormat = id;
    }

    get id() {
        return this.#config.id;
    }

    createFormatHandler(formatHandlers, normalizers) {
        validate(`ResourceFormat ${this.id}`, this.#config)
            .objectProperty('resourceFilter', 'normalizers')
            .arrayOfFunctions('segmentDecorators');
        return new FormatHandler({
            ...this.#config,
            formatHandlers,
            normalizers,
        });
    }

    // ResourceFormatConfig sugar setters

    resourceFilter(filter) {
        this.#config.resourceFilter = filter;
        return this;
    }

    defaultMessageFormat(format) {
        this.#config.defaultMessageFormat = format;
        return this;
    }

    segmentDecorators(decorators) {
        this.#config.segmentDecorators = decorators;
        return this;
    }
}

export class MessageFormatConfig {

    /**
     * @type {Object} NormalizerConfig
     * @property {Array} decoders
     * @property {Array} textEncoders
     * @property {Array} codeEncoders
     * @property {string} joiner
     */
    #config = {};

    constructor(id) {
        if (!id) {
            throw new Error('Message Format id is required');
        }
        this.#config.id = id;
    }

    get id() {
        return this.#config.id;
    }

    createNormalizer() {
        validate(`MessageFormat ${this.id}`, this.#config)
            .arrayOfFunctions('decoders', 'textEncoders', 'codeEncoders', 'joiner');
        return new Normalizer(this.#config);
    }

    // MessageFormatConfig sugar setters

    decoders(decoders) {
        this.#config.decoders = decoders;
        return this;
    }

    textEncoders(encoders) {
        this.#config.textEncoders = encoders;
        return this;
    }

    codeEncoders(encoders) {
        this.#config.codeEncoders = encoders;
        return this;
    }

    joiner(joiner) {
        this.#config.joiner = joiner;
        return this;
    }
}

export class ChannelConfig {
    #channelOptions = {};

    /**
     * @type {Object} ChannelConfig
     * @property {string} id - Unique identifier of the channel.
     * @property {Source} source - Source adapter for fetching resources from the source.
     * @property {Object} formatHandlers - A map of format name to `FormatHandler` objects that can be used to process resources of each format.
     * @property {string} [defaultResourceFormat] - The default resource format to use when a resource doesn't specify one.
     * @property {Target} [target] - Target adapter for storing translated resources.
     */
    #config = {};
    #resourceFormats = {};
    #messageFormats = {};
    #translationPolicyPipeline = [];
    #currentResourceFormat;
    #currentMessageFormat;

    constructor(id, baseDir) {
        if (!id) {
            throw new Error('Channel id is required');
        }
        this.#config.id = id;
        this.#config.defaultResourceFormat = id;
        baseDir && (this.#channelOptions.baseDir = baseDir);
    }

    get id() {
        return this.#config.id;
    }

    createChannel() {
        validate(`Channel ${this.id}`, this.#config).objectProperty('source', 'target');
        this.#config.source?.setChannelOptions && this.#config.source.setChannelOptions(this.#channelOptions);
        this.#config.target?.setChannelOptions && this.#config.target.setChannelOptions(this.#channelOptions);
        Object.keys(this.#messageFormats).length === 0 && (this.#messageFormats[this.id] = new MessageFormatConfig(this.id)); // at least have an empty normalizer!
        const normalizers = Object.fromEntries(Object.entries(this.#messageFormats)
            .map(([ id, format ]) => [ id, format.createNormalizer() ]));
        const formatHandlers = {};
        Object.entries(this.#resourceFormats).forEach(([ id, format ]) => {
            formatHandlers[id] = format.createFormatHandler(formatHandlers, normalizers);
        });
        return new Channel({
            ...this.#config,
            translationPolicyPipeline: this.#translationPolicyPipeline,
            formatHandlers,
        });
    }

    source(source) {
        this.#config.source = source;
        return this;
    }

    target(target) {
        this.#config.target = target;
        return this;
    }

    policy(policy) {
        if (Array.isArray(policy)) {
            policy.forEach(p => this.policy(p));
            return this;
        }
        if (typeof policy !== 'function') {
            throw new Error(`Translation policies must be of type function: ${policy}`);
        }
        this.#translationPolicyPipeline.push(policy);
        return this;
    }

    // ResourceFormatConfig sugar setters

    resourceFormat(resourceFormatConfig) {
        this.#resourceFormats[resourceFormatConfig.id] = resourceFormatConfig;
        this.#currentResourceFormat = resourceFormatConfig;
        return this;
    }

    #proxyResourceFormatSugarSetter(method, value) {
        this.#currentResourceFormat ??= new ResourceFormatConfig(this.id);
        this.#resourceFormats[this.#currentResourceFormat.id] ??= this.#currentResourceFormat;
        this.#currentResourceFormat[method](value);
        return this;
    }

    resourceFilter(filter) {
        return this.#proxyResourceFormatSugarSetter('resourceFilter', filter);
    }

    defaultMessageFormat(format) {
        return this.#proxyResourceFormatSugarSetter('defaultMessageFormat', format);
    }

    segmentDecorators(decorators) {
        return this.#proxyResourceFormatSugarSetter('segmentDecorators', decorators);
    }


    // MessageFormatConfig sugar setters

    messageFormat(messageFormatConfig) {
        this.#messageFormats[messageFormatConfig.id] = messageFormatConfig;
        return this;
    }

    #proxyMessageFormatSugarSetter(method, value) {
        this.#currentMessageFormat ??= new MessageFormatConfig(this.id);
        this.#messageFormats[this.#currentMessageFormat.id] ??= this.#currentMessageFormat;
        this.#currentMessageFormat[method](value);
        return this;
    }

    decoders(decoders) {
        return this.#proxyMessageFormatSugarSetter('decoders', decoders);
    }

    textEncoders(encoders) {
        return this.#proxyMessageFormatSugarSetter('textEncoders', encoders);
    }

    codeEncoders(encoders) {
        return this.#proxyMessageFormatSugarSetter('codeEncoders', encoders);
    }

    joiner(joiner) {
        return this.#proxyMessageFormatSugarSetter('joiner', joiner);
    }
}

/**
 * Represents the configuration class for L10n Monster.
 * This class is used to initialize `MonsterManager` and run all localization processes.
 */
export class L10nMonsterConfig {

    /** @type {string} The source language for localization. */
    sourceLang;

    /** @type {Object} Configuration for different channels. */
    channels = {};

    /** @type {Object} Configuration for different formats. */
    formats = {};

    /** @type {Object} Providers for the localization process. */
    providers = [];

    /** @type {boolean} Whether to automatically create snapshots at each run. */
    autoSnap = true;

    /** @type {boolean} Whether to save failed jobs as pending. */
    saveFailedJobs = false;

    /** @type {Object} Configuration for the tm stores. */
    tmStores;

    /** @type {string} Operation logs store. */
    opsStore;

    /** @type {Array} List of actions available for the localization process. */
    actions = Object.values(actions);

    /**
     * Initializes the L10nMonsterConfig with a base directory.
     * @param {string} baseDir - The base directory for relative paths.
     * @throws {string} Throws an error if the base directory is not provided.
     */
    constructor(baseDir) {
        if (!baseDir) {
            throw new Error('Cannot initialize without a base directory (hint: pass import.meta.dirname)');
        }
        L10nContext.baseDir = baseDir;
    }

    /**
     * Configures a channel.
     * @param {ChannelConfig | Array<ChannelConfig>} config - The configuration object for the channel.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    channel(config) {
        if (Array.isArray(config)) {
            config.forEach(c => this.channel(c));
            return this;
        }
        if (this.channels[config.id]) {
            throw new Error(`Channel with id ${config.id} already exists`);
        }
        this.channels[config.id] = config;
        return this;
    }

    provider(provider) {
        if (Array.isArray(provider)) {
            provider.forEach(p => this.provider(p));
            return this;
        }
        if (this.providers.find(p => p.id === provider.id)) {
            throw new Error(`Provider with id ${provider.id} already exists`);
        }
        if (!provider.id || typeof provider.create !== 'function' || typeof provider.start !== 'function' || typeof provider.continue !== 'function') {
            throw new Error('Providers must have an id and the following methods: create, start, continue');
        }
        this.providers.push(provider);
        return this;
    }

    /**
     * Configures operations for the localization process.
     * @param {Object} config - The operations configuration object.
     * @param {boolean} [config.autoSnap] - Configuration for the snapshot store.
     * @param {boolean} [config.saveFailedJobs] - Whether to save failed jobs as pending.
     * @param {Array} [config.analyzers] - Configuration for analyzers.
     * @param {Object} [config.opsStore] - Directory for operations.
     * @param {Intl.NumberFormat} [config.currencyFormatter] - A currency formatter for estimated costs.
     * @param {string|boolean} [config.sourceDB] - Source database filename or false to disable writing DB files.
     * @param {string|boolean} [config.tmDB] - TM database filename or false to disable writing DB files.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    operations({
        autoSnap,
        saveFailedJobs,
        analyzers,
        opsStore,
        currencyFormatter,
        sourceDB,
        tmDB,
    }) {
        autoSnap !== undefined && (this.autoSnap = Boolean(autoSnap));
        this.saveFailedJobs = Boolean(saveFailedJobs);
        this.analyzers = analyzers;
        this.opsStore = opsStore;
        currencyFormatter && (this.currencyFormatter = currencyFormatter);
        this.sourceDB = sourceDB;
        this.tmDB = tmDB;
        return this;
    }

    /**
     * Adds a TM store to the set of available TM Stores.
     * @param {import('@l10nmonster/core').TMStore | Array<import('@l10nmonster/core').TMStore>} storeInstance - The TM Store instance or array of instances.
     * @returns {L10nMonsterConfig} Returns the config for method chaining.
     */
    tmStore(storeInstance) {
        if (Array.isArray(storeInstance)) {
            storeInstance.forEach((s) => this.tmStore(s));
            return this;
        }
        if (storeInstance.id && storeInstance.access && storeInstance.partitioning) {
            this.tmStores ??= {};
            if (this.tmStores[storeInstance.id]) {
                throw new Error(`TM Store with id ${storeInstance.id} already exists`);
            }
            this.tmStores[storeInstance.id] = storeInstance;
            return this;
        }
        throw new Error('A id, access, and partitioning are required to instantiate a TM Store');
    }

    /**
     * Adds an action to the list of available actions for the localization process.
     * @param {Object} actionDefinition - The action definition object.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    action(actionDefinition) {
        this.actions.push(actionDefinition);
        return this;
    }

    /**
     * An optional initialization callback to finish initilizing async children before use.
     * @param {MonsterManager} [mm] - The initialized instance of Monster Manager
     * @return {Promise<void>}
     */
    // eslint-disable-next-line no-unused-vars
    async init(mm) {
        L10nContext.logger.verbose('L10nMonsterConfig initialized!');
    }

    /**
     * Runs the localization process with the given global options and callback.
     * @param {Object} globalOptions - The global options for the localization process.
     * @param {Function} cb - The callback function to execute after initialization.
     * @returns {Promise} Returns a promise that resolves with the response from the callback.
     * @throws {string} Throws an error if the localization process fails.
     */
    async run(globalOptions, cb) {
        L10nContext.setVerbosity(globalOptions.verbose);
        L10nContext.regression = Boolean(globalOptions.regression);

        try {
            const mm = new MonsterManager(this);
            await mm.init();
            const createHandler = action => (opts => action(mm, { ...globalOptions, ...opts}));
            const flattenedActions = [];
            for (const action of this.actions) {
                if (action.subActions) {
                    action.subActions.forEach(subAction => flattenedActions.push([ subAction.name, createHandler(subAction.action) ]));
                } else {
                    flattenedActions.push([ action.name, createHandler(action.action) ]);
                }
            }
            L10nContext.logger.verbose(`Registered actions: ${flattenedActions.map(e => e[0]).join(', ')}`);
            const l10n = Object.fromEntries(flattenedActions);
            let response, error;
            try {
                response = await cb(l10n, mm);
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
}

export const config = {
    l10nMonster: baseDir => new L10nMonsterConfig(baseDir),
    channel: (id, baseDir) => new ChannelConfig(id, baseDir),
    resourceFormat: id => new ResourceFormatConfig(id),
    messageFormat: id => new MessageFormatConfig(id),
};
