import * as path from 'path';
import wordsCountModule from 'words-count';

import TMManager from './tmManager.js';
import SourceManager from './sourceManager.js';
import { utils, stores } from '@l10nmonster/helpers';

export class MonsterManager {
    constructor({ monsterDir, monsterConfig, configSeal }) {
        if (monsterDir && monsterConfig && monsterConfig.sourceLang &&
                (monsterConfig.contentTypes || monsterConfig.source || monsterConfig.snapStore) === undefined) {
            throw 'You must specify sourceLang and contentTypes / source / snapStore in your config';
        } else {
            this.monsterDir = monsterDir;
            this.configSeal = configSeal;
            this.jobStore = monsterConfig.jobStore ?? new stores.JsonJobStore();
            this.debug = monsterConfig.debug ?? {};
            this.sourceLang = monsterConfig.sourceLang;
            this.minimumQuality = monsterConfig.minimumQuality;
            if (monsterConfig.contentTypes) {
                this.contentTypes = monsterConfig.contentTypes;
                ['source', 'resourceFilter', 'segmentDecorator', 'decoders', 'textEncoders', 'codeEncoders', 'target']
                    .forEach(propName => {
                        if (this[propName] !== undefined) {
                            throw `You can't specify ${propName} if you use contentType`;
                        }
                    });
            } else {
                this.contentTypes = {
                    default: {
                        source: monsterConfig.source,
                        resourceFilter: monsterConfig.resourceFilter,
                        segmentDecorator: monsterConfig.segmentDecorator,
                        decoders: monsterConfig.decoders,
                        textEncoders: monsterConfig.textEncoders,
                        codeEncoders: monsterConfig.codeEncoders,
                        target: monsterConfig.target,
                    }
                };
            }
            for (const [type, pipeline] of Object.entries(this.contentTypes)) {
                if (!pipeline.resourceFilter) {
                    throw `You must specify a resourceFilter in content type ${type}`;
                }
                ['source', 'resourceFilter', 'target']
                    .forEach(propName => {
                        if (pipeline[propName] !== undefined && typeof pipeline[propName] !== 'object') {
                            throw `Property ${propName} in contentType ${type} must be an object`;
                        }
                    });
                ['segmentDecorator']
                    .forEach(propName => {
                        if (pipeline[propName] !== undefined && typeof pipeline[propName] !== 'function') {
                            throw `Property ${propName} in contentType ${type} must be a function`;
                        }
                    });
                ['decoders', 'textEncoders', 'codeEncoders']
                    .forEach(propName => {
                        if (pipeline[propName] !== undefined) {
                            if (!Array.isArray(pipeline[propName])) {
                                throw `Property ${propName} in contentType ${type} must be an array`;
                            }
                            pipeline[propName].forEach((coder, idx) => {
                                if (typeof coder !== 'function') {
                                    throw `Coder at index ${idx} in property ${propName} in contentType ${type} must be a function`;
                                }
                            });
                        }
                    });
            }
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
            const seqMapPath = monsterConfig.seqMap && path.join(l10nmonster.baseDir, monsterConfig.seqMap);
            this.source = new SourceManager({
                configSeal,
                contentTypes: this.contentTypes,
                snapStore: monsterConfig.snapStore,
                seqMapPath,
                seqThreshold: monsterConfig.seqThreshold,
            });
            this.tmm = new TMManager({ monsterDir, jobStore: this.jobStore, configSeal });
            this.snapStore = monsterConfig.snapStore;
            this.analyzers = monsterConfig.analyzers ?? {};
            this.capabilitiesByType = Object.fromEntries(Object.entries(this.contentTypes).map(([type, pipeline]) => [ type, {
                snap: Boolean(pipeline.source && this.snapStore),
                status: Boolean(pipeline.source),
                push: Boolean(pipeline.source && Object.keys(this.translationProviders).length > 0),
                pull: Boolean(Object.keys(this.translationProviders).length > 0),
                translate: Boolean(pipeline.source && pipeline.target),
            }]));
            this.capabilities = Object.values(this.capabilitiesByType).reduce((p, c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [ k, (p[k] === undefined ? true : p[k]) && v ])), {});
        }
    }

    // return segments in a resource decorated for the target languge
    #getDecoratedSegments(res, targetLang) {
        const pipeline = this.contentTypes[res.contentType];
        return pipeline.segmentDecorator ? pipeline.segmentDecorator(res.segments, targetLang) : res.segments;
    }

    // get all possible target languages from sources and from TMs
    async getTargetLangs(limitToLang, includeAll) {
        let srcTargetLangs = new Set();
        // eslint-disable-next-line no-unused-vars
        const resourceStats = await this.source.getResourceStats();
        resourceStats.forEach(res => res.targetLangs.forEach(targetLang => srcTargetLangs.add(targetLang)));
        const allTargetLangs = new Set(srcTargetLangs);
        Object.values(await this.jobStore.getAvailableLangPairs())
            .forEach(pair => allTargetLangs.add(pair[1]));
        if (limitToLang) {
            const langsToLimit = limitToLang.split(',');
            const invalidLangs = langsToLimit.filter(limitedLang => !allTargetLangs.has(limitedLang));
            if (invalidLangs.length > 0) {
                throw `Invalid languages: ${invalidLangs.join(',')}`;
            }
            return langsToLimit;
        }
        return includeAll ? [...allTargetLangs] : [...srcTargetLangs];
    }

    // get source, decorate it for the target languge, and convert it to tu format
    async getSourceAsTus(targetLang) {
        const sourceLookup = {};
        for await (const res of this.source.getAllResources()) {
            const decoratedSegments = this.#getDecoratedSegments(res, targetLang);
            for (const seg of decoratedSegments) {
                sourceLookup[seg.guid] = utils.makeTU(res, seg);
            }
        }
        return sourceLookup;
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
        const updatedAt = (l10nmonster.regression ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
        if (jobRequest) {
            jobRequest.updatedAt = updatedAt;
            await this.jobStore.writeJob(jobRequest);
        }
        if (jobResponse) {
            jobResponse.updatedAt = updatedAt;
            await this.jobStore.writeJob(jobResponse);
        }
    }

    // eslint-disable-next-line complexity
    async #internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            tus: [],
        };
        minimumQuality ??= this.getMinimumQuality(job);
        const tm = await this.tmm.getTM(this.sourceLang, targetLang); // TODO: source language may vary by resource or unit, if supported
        const prjLeverage = {};
        const repetitionMap = {};
        let resourceCount = 0;
        for await (const res of this.source.getAllResources()) {
            resourceCount++;
            const prj = res.prj || 'default';
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
            if (res.targetLangs.includes(targetLang) && targetLang !== this.sourceLang) {
                const decoratedSegments = this.#getDecoratedSegments(res, targetLang);
                for (const seg of decoratedSegments) {
                    // TODO: if segment is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                    const tmEntry = tm.getEntryByGuid(seg.guid);
                    const tu = utils.makeTU(res, seg);
                    const plainText = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('') : tu.src;
                    const words = wordsCountModule.wordsCount(plainText);
                    // TODO: compatibility is actually stricter than GUID, this leads to extra translations that can't be stored
                    const isCompatible = utils.sourceAndTargetAreCompatible(tu?.nsrc ?? tu?.src, tmEntry?.ntgt ?? tmEntry?.tgt);
                    if (!tmEntry || (!tmEntry.inflight && (!isCompatible || tmEntry.q < minimumQuality))) {
                        // if the same src is in flight already, mark it as an internal repetition
                        tm.getAllEntriesBySrc(tu.nsrc ?? tu.src).filter(tu => tu.q >= minimumQuality).length > 0 && (repetitionMap[tu.src] = true);
                        if (repetitionMap[tu.src]) {
                            leverageDetails.internalRepetitions++;
                            leverageDetails.internalRepetitionWords += words;
                            !leverage && job.tus.push(tu);
                        } else {
                            repetitionMap[tu.src] = true;
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
        return [ job, { tmSize: tm.guids.length, minimumQuality, prjLeverage, numSources: resourceCount } ];
    }

    async prepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        return (await this.#internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }))[0];
    }

    async estimateTranslationJob({ targetLang }) {
        return (await this.#internalPrepareTranslationJob({ targetLang }))[1];
    }

    async prepareFilterBasedJob({ targetLang, tmBased, guidList }) {
        const tm = await this.tmm.getTM(this.sourceLang, targetLang);
        const sourceLookup = await this.getSourceAsTus(targetLang);
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
        this.jobStore.shutdown && await this.jobStore.shutdown();
        await this.source.shutdown();
        await this.tmm.shutdown();
    }
}
