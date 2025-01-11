import { L10nContext, MonsterManager, actions } from '@l10nmonster/core';

function createHandler(mm, globalOptions, action) {
    return opts => action(mm, { ...globalOptions, ...opts});
}

/**
 * Represents the configuration class for L10n Monster.
 * This class is used to initialize `MonsterManager` and run all localization processes.
 */
export class L10nMonsterConfig {

    /** @type {string} The source language for localization. */
    sourceLang;

    /** @type {Object} Sets of target languages for localization. */
    targetLangSets;

    /**
     * @type {number | Function}
     * Either a number constant or a function that given a job it returns a number.
     * Existing translations below the given quality will be ignored and sent to translation.
     */
    minimumQuality;

    /** @type {Object} Configuration for different channels. */
    channels = {};

    /** @type {Object} Configuration for different formats. */
    formats = {};

    /** @type {Object} Translation providers for the localization process. */
    translationProviders;

    /** @type {Object} Configuration for the snapshot store. */
    snapStore;

    /** @type {Object} Configuration for the job store. */
    jobStore;

    /** @type {string} Directory for operation logs. */
    opsDir;

    /** @type {Array} List of actions available for the localization process. */
    actions = Object.values(actions);

    /**
     * Initializes the L10nMonsterConfig with a base directory.
     * @param {string} baseDir - The base directory for relative paths.
     * @throws {string} Throws an error if the base directory is not provided.
     */
    constructor(baseDir) {
        if (!baseDir) {
            throw 'Cannot initialize without a base directory (hint: pass import.meta.dirname)';
        }
        L10nContext.baseDir = baseDir;
    }

    /**
     * Sets basic properties for the localization process.
     * @param {Object} config - Configuration object containing basic properties.
     * @param {string} config.sourceLang - The source language for localization.
     * @param {Array | Object} config.targetLangs - The target languages for localization.
     * @param {Object} [config.targetLangSets] - Sets of target languages for localization.
     * @param {number | Function} config.minimumQuality - The minimum quality threshold for translations.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    basicProperties({
        sourceLang,
        targetLangs,
        targetLangSets,
        minimumQuality,
    }) {
        this.sourceLang = sourceLang;
        this.targetLangSets = targetLangSets ? targetLangSets : { default: targetLangs };
        this.minimumQuality = minimumQuality;
        return this;
    }

    /**
     * Configures a channel with the given ID and configuration.
     * @param {string} id - The ID of the channel.
     * @param {Object} config - The configuration object for the channel.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    channel(id, config) {
        this.channels[id] = config;
        return this;
    }

    /**
     * Configures a format with the given ID and configuration.
     * @param {string} id - The ID of the format.
     * @param {Object} config - The configuration object for the format.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    format(id, config) {
        this.formats[id] = config;
        return this;
    }

    /**
     * Configures content types with a simplified configuration option.
     * @param {Object} contentTypes - The content types configuration object.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    contentTypes(contentTypes) {
        for (const [ id, config ] of Object.entries(contentTypes)) {
            this.channel(id, {
                source: config.source,
                target: config.target,
                defaultResourceFormat: id,
            });
            const normalizers = {};
            normalizers[id] = {
                decoders: config.decoders,
                textEncoders: config.textEncoders,
                codeEncoders: config.codeEncoders,
                joiner: config.joiner,
            };
            this.format(id, {
                resourceFilter: config.resourceFilter,
                normalizers,
                defaultMessageFormat: id,
                segmentDecorators: config.segmentDecorators,
            });
        }
        return this;
    }

    /**
     * Sets a single content type configuration.
     * This method is a convenience wrapper around `contentTypes` that allows
     * setting a single content type with a default key.
     * @param {Object} contentType - The configuration object for the content type.
     * @param {import('..').SourceAdapter} [contentType.source] - The source adapter.
     * @param {import('..').ResourceFilter} [contentType.resourceFilter] - Optional resource filter for the content type.
     * @param {Array} [contentType.decoders] - Optional decoders for the content type.
     * @param {Array} [contentType.segmentDecorators] - Optional segment decorators for the content type.
     * @param {Array} [contentType.textEncoders] - Optional text encoders for the content type.
     * @param {Array} [contentType.codeEncoders] - Optional code encoders for the content type.
     * @param {Function} [contentType.joiner] - Optional joiner function for the content type.
     * @param {import('..').TargetAdapter} [contentType.target] - The target adapter.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    contentType(contentType) {
        return this.contentTypes({ default: contentType });
    }

    /**
     * Configures translation providers for the localization process.
     * @param {Object} translationProviders - The translation providers configuration object.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    translators(translationProviders) {
        this.translationProviders = translationProviders;
        return this;
    }

    /**
     * Configures a single translation provider for the localization process.
     * @param {Object} translationProvider - The translation provider configuration object.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    singleTranslator(translationProvider) {
        const translationProviders = { };
        translationProviders[translationProvider.constructor.name] = {
            translator: translationProvider,
        };
        return this.translators(translationProviders);
    }

    /**
     * Configures operations for the localization process.
     * @param {Object} config - The operations configuration object.
     * @param {Object} [config.snapStore] - Configuration for the snapshot store.
     * @param {Object} [config.jobStore] - Configuration for the job store.
     * @param {Object} [config.tmm] - Configuration for the translation memory manager.
     * @param {Object} [config.tuFilters] - Configuration for translation unit filters.
     * @param {Array} [config.analyzers] - Configuration for analyzers.
     * @param {string} [config.opsDir] - Directory for operations.
     * @returns {L10nMonsterConfig} Returns the instance for method chaining.
     */
    operations({
        snapStore,
        jobStore,
        tmm,
        tuFilters,
        analyzers,
        opsDir,
    }) {
        this.snapStore = snapStore;
        this.jobStore = jobStore;
        this.tmm = tmm;
        this.tuFilters = tuFilters;
        this.analyzers = analyzers;
        this.opsDir = opsDir;
        return this;
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
        L10nContext.prj = globalOptions.prj ? globalOptions.prj.split(',') : undefined;
        L10nContext.arg = globalOptions.arg;

        try {
            const mm = new MonsterManager(this);
            await mm.init();
            L10nContext.logger.verbose(`L10n Monster factory-initialized!`);
            const l10n = Object.fromEntries(this.actions.map(Cmd => [ Cmd.name, createHandler(mm, globalOptions, Cmd.action) ]));
            let response;
            try {
                response = await cb(l10n, mm);
            } catch(e) {
                response = { error: e.stack ?? e };
            } finally {
                mm && (await mm.shutdown());
            }
            if (response?.error) {
                throw response.error;
            }
            return response;
        } catch(e) {
            throw `Unable to run L10n Monster: ${e.stack || e}`;
        }
    }
}
