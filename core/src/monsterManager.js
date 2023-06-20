import wordsCountModule from 'words-count';

import TMManager from './tmManager.js';
import ResourceManager from './resourceManager.js';
import { utils } from '@l10nmonster/helpers';
import { TU } from './entities/tu.js';

export class MonsterManager {
    #targetLangs;
    #targetLangSets = {};
    #functionsForShutdown;

    constructor({ monsterDir, monsterConfig, configSeal }) {
        if (!monsterConfig?.sourceLang) {
            throw 'You must specify sourceLang in your config';
        }
        if (typeof monsterConfig?.targetLangs !== 'object') {
            throw 'You must specify a targetLangs object or array in your config';
        } else if (Array.isArray(monsterConfig.targetLangs)) {
            this.#targetLangs = new Set(monsterConfig.targetLangs);
        } else {
            this.#targetLangs = new Set(Object.values(monsterConfig.targetLangs).flat(1));
            this.#targetLangSets = monsterConfig.targetLangs;
        }
        if (!(monsterConfig?.jobStore ?? monsterConfig?.snapStore)) {
            throw 'You must specify at least a jobStore or a snapStore in your config';
        }
        this.monsterDir = monsterDir;
        this.configSeal = configSeal;
        this.jobStore = monsterConfig.jobStore;
        this.jobStore.shutdown && this.scheduleForShutdown(this.jobStore.shutdown.bind(this.jobStore));
        this.sourceLang = monsterConfig.sourceLang;
        this.minimumQuality = monsterConfig.minimumQuality;
        this.#functionsForShutdown = [];
        let contentTypes;
        if (monsterConfig.contentTypes || monsterConfig.channels || monsterConfig.formats) {
            contentTypes = monsterConfig.contentTypes;
            ['source', 'resourceFilter', 'segmentDecorators', 'decoders', 'textEncoders', 'codeEncoders', 'joiner', 'target']
                .forEach(propName => {
                    if (monsterConfig[propName] !== undefined) {
                        throw `You can't specify ${propName} at the top level if you also use advance configurations`;
                    }
                });
        } else {
            contentTypes = {
                default: {
                    source: monsterConfig.source,
                    resourceFilter: monsterConfig.resourceFilter,
                    segmentDecorators: monsterConfig.segmentDecorators,
                    decoders: monsterConfig.decoders,
                    textEncoders: monsterConfig.textEncoders,
                    codeEncoders: monsterConfig.codeEncoders,
                    joiner: monsterConfig.joiner,
                    target: monsterConfig.target,
                }
            };
        }
        let channels, formats;
        if (contentTypes) {
            if (monsterConfig.channels || monsterConfig.formats) {
                throw `You can't specify channels/formats if you also use contentTypes`;
            }
            channels = {};
            formats = {};
            for (const [ type, config ] of Object.entries(contentTypes)) {
                channels[type] = {
                    source: config.source,
                    target: config.target,
                    defaultResourceFormat: type,
                };
                const normalizers = {};
                normalizers[type] = {
                    decoders: config.decoders,
                    textEncoders: config.textEncoders,
                    codeEncoders: config.codeEncoders,
                    joiner: config.joiner,
                };
                formats[type] = {
                    resourceFilter: config.resourceFilter,
                    normalizers,
                    defaultMessageFormat: type,
                    segmentDecorators: config.segmentDecorators,
                };
            }
        } else {
            channels = monsterConfig.channels;
            formats = monsterConfig.formats;
        }
        this.rm = new ResourceManager({
            configSeal,
            channels,
            formats,
            snapStore: monsterConfig.snapStore,
            defaultSourceLang: monsterConfig.sourceLang,
            defaultTargetLangs: [ ...this.#targetLangs ].sort(),
        });
        this.scheduleForShutdown(this.rm.shutdown.bind(this.rm));
        if (monsterConfig.translationProviders) {
            this.translationProviders = monsterConfig.translationProviders;
            // spell it out to use additional options like pairs: { sourceLang: [ targetLang1 ]}
        } else {
            this.translationProviders = { };
            monsterConfig.translationProvider && (this.translationProviders[monsterConfig.translationProvider.constructor.name] = {
                translator: monsterConfig.translationProvider,
            });
        }
        this.tuFilters = monsterConfig.tuFilters;
        this.tmm = new TMManager({ monsterDir, jobStore: this.jobStore, configSeal });
        this.scheduleForShutdown(this.tmm.shutdown.bind(this.tmm));
        this.analyzers = monsterConfig.analyzers ?? {};
        this.capabilitiesByChannel = Object.fromEntries(Object.entries(channels).map(([type, channel]) => [ type, {
            snap: Boolean(channel.source && monsterConfig.snapStore),
            status: Boolean(channel.source),
            push: Boolean(channel.source && Object.keys(this.translationProviders).length > 0),
            pull: Boolean(Object.keys(this.translationProviders).length > 0),
            translate: Boolean(channel.source && channel.target),
        }]));
        this.capabilities = Object.values(this.capabilitiesByChannel).reduce((p, c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [ k, (p[k] === undefined ? true : p[k]) && v ])), {});
        this.extensionCmds = monsterConfig.constructor.extensionCmds;
    }

    // register an async function to be called during shutdown
    scheduleForShutdown(func) {
        this.#functionsForShutdown.push(func);
    }

    // get all possible target languages from sources and from TMs
    getTargetLangs(limitToLang) {
        if (limitToLang) {
            const targetLangSet = utils.fixCaseInsensitiveKey(this.#targetLangSets, limitToLang);
            if (targetLangSet) {
                const langs = this.#targetLangSets[targetLangSet];
                l10nmonster.logger.info(`Using language alias ${targetLangSet}: ${langs.join(', ')}`);
                return langs;
            }
            const langsToLimit = limitToLang.split(',');
            const invalidLangs = langsToLimit.filter(limitedLang => !this.#targetLangs.has(limitedLang));
            if (invalidLangs.length > 0) {
                throw `Invalid languages: ${invalidLangs.join(',')}`;
            }
            return langsToLimit;
        }
        return [ ...this.#targetLangs ];
    }

    getMinimumQuality(jobManifest) {
        let minimumQuality = this.minimumQuality;
        if (typeof minimumQuality === 'function') {
            minimumQuality = minimumQuality(jobManifest);
        }
        if (minimumQuality === undefined) {
            throw 'You must specify a minimum quality in your config';
        } else {
            return minimumQuality;
        }
    }

    // use cases:
    //   1 - both are passed as both are created at the same time -> may cancel if response is empty
    //   2 - only jobRequest is passed because it's blocked -> write if "blocked", cancel if "created"
    //   3 - only jobResponse is passed because it's pulled -> must write even if empty or it will show as blocked/pending
    async processJob(jobResponse, jobRequest) {
        if (jobRequest && jobResponse && !(jobResponse.tus?.length > 0 || jobResponse.inflight?.length > 0)) {
            jobResponse.status = 'cancelled';
            return;
        }
        if (jobRequest && !jobResponse && jobRequest.status === 'created') {
            jobRequest.status = 'cancelled';
            return;
        }
        // we get the TM before writing jobs so that we don't process the same job twice
        const tm = await this.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
        const updatedAt = (l10nmonster.regression ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
        if (jobRequest) {
            jobRequest.updatedAt = updatedAt;
            if (jobResponse) {
                const guidsInFlight = jobResponse.inflight ?? [];
                const translatedGuids = jobResponse?.tus?.map(tu => tu.guid) ?? [];
                const acceptedGuids = new Set(guidsInFlight.concat(translatedGuids));
                jobRequest.tus = jobRequest.tus.filter(tu => acceptedGuids.has(tu.guid));
            }
            await this.jobStore.writeJob(jobRequest);
        }
        if (jobResponse) {
            jobResponse.updatedAt = updatedAt;
            await this.jobStore.writeJob(jobResponse);
        }
        // we update the TM in memory so that it can be reused before shutdown
        // TODO: this is not great, we should have a hook so that the TM can
        //       subscribe to mutation events.
        await tm.processJob(jobResponse, jobRequest);
    }

    // eslint-disable-next-line complexity
    async #internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            tus: [],
        };
        minimumQuality ??= this.getMinimumQuality(job);
        const prjLeverage = {};
        const repetitionMap = {};
        let resourceCount = 0;
        for await (const resHandle of this.rm.getAllResources()) {
            resourceCount++;
            const prj = resHandle.prj || 'default';
            prjLeverage[prj] ??= {
                translated: 0,
                translatedWords: 0,
                translatedByQ: {},
                untranslated: 0,
                untranslatedChars: 0,
                untranslatedWords: 0,
                pending: 0,
                pendingWords: 0,
                internalRepetitions: 0,
                internalRepetitionWords: 0,
            };
            const leverageDetails = prjLeverage[prj];
            if (resHandle.targetLangs.includes(targetLang) && targetLang !== this.sourceLang) {
                const tm = await this.tmm.getTM(resHandle.sourceLang, targetLang);
                for (const seg of resHandle.segments) {
                    // TODO: if segment is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                    const tmEntry = tm.getEntryByGuid(seg.guid);
                    const tu = TU.fromSegment(resHandle, seg);
                    const plainText = tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('');
                    const words = wordsCountModule.wordsCount(plainText);
                    // TODO: compatibility is actually stricter than GUID, this leads to extra translations that can't be stored
                    const isCompatible = utils.sourceAndTargetAreCompatible(tu?.nsrc, tmEntry?.ntgt);
                    if (!tmEntry || (!tmEntry.inflight && (!isCompatible || tmEntry.q < minimumQuality))) {
                        // if the same src is in flight already, mark it as an internal repetition
                        tm.getAllEntriesBySrc(tu.nsrc).filter(tu => tu.q >= minimumQuality).length > 0 && (repetitionMap[seg.gstr] = true);
                        if (repetitionMap[seg.gstr]) {
                            leverageDetails.internalRepetitions++;
                            leverageDetails.internalRepetitionWords += words;
                            !leverage && job.tus.push(tu);
                        } else {
                            repetitionMap[seg.gstr] = true;
                            job.tus.push(tu);
                            leverageDetails.untranslated++;
                            leverageDetails.untranslatedChars += plainText.length;
                            leverageDetails.untranslatedWords += words;
                        }
                    } else {
                        if (tmEntry.inflight) {
                            leverageDetails.pending++;
                            leverageDetails.pendingWords += words;
                        } else {
                            leverageDetails.translated ??= 0;
                            leverageDetails.translated++;
                            leverageDetails.translatedWords += words;
                            leverageDetails.translatedByQ[tmEntry.q] ??= 0;
                            leverageDetails.translatedByQ[tmEntry.q]++;
                        }
                    }
                }
            }
        }
        // TODO: job should actually be a list of jobs to be able to handle multiple source languages and pipelines
        return [ job, { minimumQuality, prjLeverage, numSources: resourceCount } ];
    }

    async prepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        return (await this.#internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }))[0];
    }

    async estimateTranslationJob({ targetLang }) {
        return (await this.#internalPrepareTranslationJob({ targetLang }))[1];
    }

    async prepareFilterBasedJob({ targetLang, tmBased, guidList }) {
        const tm = await this.tmm.getTM(this.sourceLang, targetLang);
        const sourceLookup = {};
        for await (const res of this.rm.getAllResources()) {
            for (const seg of res.segments) {
                sourceLookup[seg.guid] = TU.fromSegment(res, seg);
            }
        }
        if (!guidList) {
            if (tmBased) {
                guidList = tm.guids;
            } else {
                guidList = Object.keys(sourceLookup);
            }
        }
        let tus = guidList.map(guid => {
            const sourceTU = sourceLookup[guid] ?? {};
            const translatedTU = tm.getEntryByGuid(guid) ?? {};
            return { ...sourceTU, ...translatedTU }; // this is a superset of source and target properties so that filters have more to work with
        });
        l10nmonster.prj !== undefined && (tus = tus.filter(tu => l10nmonster.prj.includes(tu.prj)));
        return {
            sourceLang: this.sourceLang,
            targetLang,
            tus,
        };
    }

    getTranslationProvider(jobManifest) {
        if (jobManifest.translationProvider) {
            jobManifest.translationProvider = utils.fixCaseInsensitiveKey(this.translationProviders, jobManifest.translationProvider);
        } else {
            for (const [ name, providerCfg ] of Object.entries(this.translationProviders)) {
                if (!providerCfg.pairs || (providerCfg.pairs[jobManifest.sourceLang] && providerCfg.pairs[jobManifest.sourceLang].includes(jobManifest.targetLang))) {
                    jobManifest.translationProvider = name;
                    break;
                }
            }
        }
        return this.translationProviders[jobManifest.translationProvider];
    }

    async shutdown() {
        for (const func of this.#functionsForShutdown) {
            await func();
        }
    }
}
