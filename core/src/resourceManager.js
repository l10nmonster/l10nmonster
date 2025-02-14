import { L10nContext } from '@l10nmonster/core';
import { Channel } from './entities/channel.js';
import { Normalizer } from './entities/normalizer.js';
import { FormatHandler } from './entities/formatHandler.js';

function validate(context, obj = {}) {
    const validators = {
        objectProperty: (...props) => {
            props.forEach(propName => {
                if (obj[propName] !== undefined && typeof obj[propName] !== 'object') {
                    throw `Property ${propName} of ${context} must be an object`;
                }
            });
            return validators;
        },
        arrayOfFunctions: (...props) => {
            props.forEach(propName => {
                if (obj[propName] !== undefined) {
                    if (!Array.isArray(obj[propName])) {
                        throw `Property ${propName} of ${context} must be an array`;
                    }
                    obj[propName].forEach((coder, idx) => {
                        if (typeof coder !== 'function') {
                            throw `Item at index ${idx} in property ${propName} of ${context} must be a function`;
                        }
                    });
                }
            });
            return validators;
        },
    }
    return validators;
}

export default class ResourceManager {
    #channels = {};

    constructor({ channels, formats, snapStore, defaultSourceLang, defaultTargetLangs }) {
        const formatHandlers = {};
        for (const [format, formatCfg] of Object.entries(formats)) {
            validate(`format ${format}`, formatCfg)
                .objectProperty('resourceFilter', 'normalizers')
                .arrayOfFunctions('segmentDecorators');
            const normalizers = {};
            for (const [normalizer, normalizerCfg] of Object.entries(formatCfg.normalizers)) {
                validate(`normalizer ${normalizer}`, normalizerCfg).arrayOfFunctions('decoders', 'textEncoders', 'codeEncoders');
                normalizers[normalizer] = new Normalizer({
                    id: normalizer,
                    decoders: normalizerCfg.decoders,
                    textEncoders: normalizerCfg.textEncoders,
                    codeEncoders: normalizerCfg.codeEncoders,
                    joiner: normalizerCfg.joiner,
                });
            }
            formatHandlers[format] = new FormatHandler({
                id: format,
                resourceFilter: formatCfg.resourceFilter,
                normalizers,
                defaultMessageFormat: formatCfg.defaultMessageFormat ?? format,
                segmentDecorators: formatCfg.segmentDecorators,
                formatHandlers, // passed in for sub-resources
            });
        }
        for (const [channelId, channelCfg] of Object.entries(channels)) {
            validate(`channel ${channelId}`, channelCfg).objectProperty('source', 'target')
            this.#channels[channelId] = new Channel({
                id: channelId,
                source: channelCfg.source,
                formatHandlers,
                defaultResourceFormat: channelCfg.defaultResourceFormat ?? channelId,
                defaultSourceLang,
                defaultTargetLangs,
                target: channelCfg.target,
            });
        }
        this.snapStore = snapStore;
    }

    async init(mm) {
        mm.scheduleForShutdown(this.shutdown.bind(this));
    }

    /**
     * Returns a channel given its id.
     *
     * @param {string} channelId String identifier of the channel.
     * @return {Channel} A channel object.
     */
    getChannel(channelId) {
        const channel = this.#channels[channelId];
        if (!channel) {
            throw `Invalid channel reference: ${channelId}`;
        }
        return channel;
    }

    //
    // Snap store internal helpers
    //

    async #getResourceHandlesFromSnapStore() {
        const stats = await this.snapStore.getResourceStats();
        return stats.map(rs => this.getChannel(rs.channel).makeResourceHandleFromObject(rs));
    }

    async *#getAllResourcesFromSnapStore(options) {
        L10nContext.logger.info(`Getting all resources from snap store...`);
        const allResources = await this.snapStore.getAllResources(options);
        for await (const normalizedResource of allResources) {
            const handle = this.getChannel(normalizedResource.channel).makeResourceHandleFromObject(normalizedResource);
            yield handle.loadFromNormalizedResource(normalizedResource);
        }
    }

    //
    // Channel internal helpers
    //

    async #getResourceHandlesFromAllChannels() {
        L10nContext.logger.info(`Getting resource stats from all sources...`);
        const combinedHandles = [];
        for (const channel of Object.values(this.#channels)) {
            const handles = await channel.getResourceHandles();
            combinedHandles.push(handles);
        }
        return combinedHandles
            .flat(1)
            .filter(e => (L10nContext.prj === undefined || L10nContext.prj.includes(e.prj)));
    }

    async *#getAllResourcesFromSources(options) {
        L10nContext.logger.info(`Getting all resources directly from sources...`);
        for (const channel of Object.values(this.#channels)) {
            const channelResources = await channel.getAllNormalizedResources(options);
            for await (const normalizedResource of channelResources) {
                yield normalizedResource;
            }
        }
    }

    //
    // Public API
    //

    async getResourceHandles() {
        return this.snapStore ? this.#getResourceHandlesFromSnapStore() : this.#getResourceHandlesFromAllChannels();
    }

    async *getAllResources(options = {}) {
        const ignoreSnapStore = options.ignoreSnapStore || options.keepRaw; // TODO: make snap stores optionally store raw as well
        return this.snapStore && !ignoreSnapStore ? yield* this.#getAllResourcesFromSnapStore(options) : yield* this.#getAllResourcesFromSources(options);
    }

    async getResource(resourceHandle, options = {}) {
        return this.snapStore ?
            resourceHandle.loadFromNormalizedResource(await this.snapStore.getResource(resourceHandle)) :
            this.getChannel(resourceHandle.channel).loadResource(resourceHandle, options);
    }

    async shutdown() {
    }
}
