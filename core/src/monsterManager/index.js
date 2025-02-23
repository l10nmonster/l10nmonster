import * as path from 'path';
import { L10nContext, TU, utils, analyzers } from '@l10nmonster/core';
import TMManager from '../tmManager/index.js';
import ResourceManager from '../resourceManager.js';
import { snapCmd } from './snap.js';
import { statusCmd } from './status.js';
import { pushCmd } from './push.js';
import { jobsCmd } from './jobs.js';
import { jobPushCmd } from './job.js';
import { pullCmd } from './pull.js';
import { analyzeCmd } from './analyze.js';

const spaceRegex = /\s+/g;

export class MonsterManager {
    #targetLangs;
    #targetLangSets = {};
    #tmStores = {};
    #functionsForShutdown = [];

    constructor(monsterConfig) {
        this.monsterConfig = monsterConfig;

        // basic properties
        if (!monsterConfig.sourceLang) {
            throw 'You must specify sourceLang in your config';
        }
        this.sourceLang = monsterConfig.sourceLang;
        if (typeof monsterConfig.targetLangSets === 'object') {
            this.#targetLangs = new Set(Object.values(monsterConfig.targetLangSets).flat(1));
            this.#targetLangSets = monsterConfig.targetLangSets;
        } else {
            throw 'You must specify a targetLangSets object in your config';
        }
        this.minimumQuality = monsterConfig.minimumQuality;

        // content types
        if (!monsterConfig.channels || !monsterConfig.formats) {
            throw `You must specify channels and formats`;
        }
        this.rm = new ResourceManager({
            channels: monsterConfig.channels,
            formats: monsterConfig.formats,
            snapStore: monsterConfig.snapStore,
            defaultSourceLang: monsterConfig.sourceLang,
            defaultTargetLangs: [ ...this.#targetLangs ].sort(),
        });

        this.translationProviders = monsterConfig.translationProviders;
        monsterConfig.tmStores && (this.#tmStores = monsterConfig.tmStores);

        monsterConfig.opsDir && L10nContext.opsMgr.setOpsDir(path.join(L10nContext.baseDir, monsterConfig.opsDir));
        this.tmm = new TMManager();

        this.tuFilters = monsterConfig.tuFilters;
        this.analyzers = { ...analyzers, ...monsterConfig.analyzers };

        // generated info
        this.capabilitiesByChannel = Object.fromEntries(Object.entries(monsterConfig.channels).map(([type, channel]) => [ type, {
            snap: Boolean(channel.source && monsterConfig.snapStore),
            status: Boolean(channel.source),
            push: Boolean(channel.source && Object.keys(this.translationProviders).length > 0),
            pull: Boolean(Object.keys(this.translationProviders).length > 0),
            translate: Boolean(channel.source && channel.target),
        }]));
        this.capabilities = Object.values(this.capabilitiesByChannel).reduce((p, c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [ k, (p[k] === undefined ? true : p[k]) && v ])), {});
    }

    async init() {
        for (const tmStore of Object.values(this.#tmStores)) {
            typeof tmStore.init === 'function' && await tmStore.init(this);
        }
        for (const tp of Object.values(this.translationProviders)) {
            typeof tp.translator.init === 'function' && await tp.translator.init(this);
        }
        typeof this.rm.init === 'function' && await this.rm.init(this);
        typeof this.tmm.init === 'function' && await this.tmm.init(this);
        typeof this.monsterConfig.init === 'function' && await this.monsterConfig.init(this);
    }

    // register an async function to be called during shutdown
    scheduleForShutdown(func) {
        this.#functionsForShutdown.push(func);
    }

     // expose L10nContext
    get l10nContext() {
        return L10nContext;
    }

    async snap(options) {
        return await snapCmd(this, options);
    }

    async status(options) {
        return await statusCmd(this, options);
    }

    async push(options) {
        return await pushCmd(this, options);
    }

    async jobPush(jobGuid) {
        return await jobPushCmd(this, jobGuid);
    }

    async jobs(options) {
        return await jobsCmd(this, options);
    }

    async pull(options) {
        return await pullCmd(this, options);
    }

    async analyze(analyzer, params, limitToLang, tuFilter) {
        return await analyzeCmd(this, analyzer, params, limitToLang, tuFilter);
    }

    // get all possible target languages from sources and from TMs
    getTargetLangs(limitToLang) {
        if (limitToLang) {
            const langsToLimit = Array.isArray(limitToLang) ? limitToLang : limitToLang.split(',');
            const targetLangs = [];
            for (const lang of langsToLimit) {
                const targetLangSet = utils.fixCaseInsensitiveKey(this.#targetLangSets, lang);
                if (targetLangSet) {
                    this.#targetLangSets[targetLangSet].forEach(lang => targetLangs.push(lang));
                } else {
                    targetLangs.push(lang);
                }
            }
            const invalidLangs = targetLangs.filter(limitedLang => !this.#targetLangs.has(limitedLang));
            if (invalidLangs.length > 0) {
                throw `Invalid languages: ${invalidLangs.join(',')}`;
            }
            return targetLangs;
        }
        return [ ...this.#targetLangs ];
    }

    getTmStore(name) {
        const fixedName = utils.fixCaseInsensitiveKey(this.#tmStores, name);
        if (fixedName) {
            return this.#tmStores[fixedName];
        } else {
            throw new Error(`Unknown tm store: ${name}`);
        }
    }

    getTmStoreNames() {
        return Object.keys(this.#tmStores);
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
                const tm = this.tmm.getTM(resHandle.sourceLang, targetLang);
                // potential tm.getMatches(segments) and tm.untranslated(segments)
                // returns either only matches or only non-ice [[ guid, { match: ice/qualified/unqualified/internal, q, } ]]
                // words and stats calculations can be done by status command
                for (const seg of resHandle.segments) {
                    // TODO: if segment is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                    const tmEntry = tm.getEntryByGuid(seg.guid);
                    const tu = TU.fromSegment(resHandle, seg);
                    const plainText = tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('');
                    const words = (plainText.match(spaceRegex)?.length || 0) + 1;
                    // TODO: compatibility is actually stricter than GUID, this leads to extra translations that can't be stored
                    const isCompatible = utils.sourceAndTargetAreCompatible(tu?.nsrc, tmEntry?.ntgt);
                    if (!tmEntry || (!tmEntry.inflight && (!isCompatible || tmEntry.q < minimumQuality))) {
                        // if the same src is in flight already, mark it as an internal repetition
                        tm.getExactMatches(tu.nsrc).filter(tu => tu.q >= minimumQuality).length > 0 && (repetitionMap[seg.gstr] = true);
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
        return (await this.#internalPrepareTranslationJob({ targetLang, minimumQuality: undefined, leverage: undefined }))[1];
    }

    async prepareFilterBasedJob({ targetLang, tmBased, guidList }) {
        const tm = this.tmm.getTM(this.sourceLang, targetLang);
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
        L10nContext.prj !== undefined && (tus = tus.filter(tu => L10nContext.prj.includes(tu.prj)));
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
