import {
    createHash,
} from 'crypto';
import wordsCountModule from 'words-count';

import TMManager from './tmManager.js';
import SourceManager from './sourceManager.js';
import { JsonJobStore } from './stores/jsonJobStore.js';
import { sourceAndTargetAreCompatible } from './normalizers/util.js';

export default class MonsterManager {
    constructor({ monsterDir, monsterConfig, configSeal, ctx }) {
        if (monsterDir && monsterConfig && monsterConfig.sourceLang &&
                (monsterConfig.translationProvider || monsterConfig.translationProviders) &&
                (monsterConfig.contentTypes || (monsterConfig.source && monsterConfig.resourceFilter && monsterConfig.target)) === undefined) {
            throw 'You must specify sourceLang, translationProvider, minimumQuality, contentTypes (or source+resourceFilter+target) in l10nmonster.mjs';
        } else {
            this.monsterDir = monsterDir;
            this.configSeal = configSeal;
            this.ctx = ctx;
            this.jobStore = monsterConfig.jobStore ?? new JsonJobStore({
                jobsDir: 'l10njobs',
            });
            this.tmm = new TMManager({ monsterDir, jobStore: this.jobStore, ctx });
            this.debug = monsterConfig.debug ?? {};
            this.sourceLang = monsterConfig.sourceLang;
            this.minimumQuality = monsterConfig.minimumQuality;
            this.qualifiedPenalty = monsterConfig.qualifiedPenalty;
            this.unqualifiedPenalty = monsterConfig.unqualifiedPenalty;
            if (monsterConfig.contentTypes) {
                this.contentTypes = monsterConfig.contentTypes;
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
            this.source = new SourceManager(this);
        }
    }

    generateGuid(str) {
        const sidContentHash = createHash('sha256');
        sidContentHash.update(str, 'utf8');
        return sidContentHash.digest().toString('base64').substring(0, 43).replaceAll('+', '-').replaceAll('/', '_');
    }

    generateFullyQualifiedGuid(rid, sid, str) {
        return this.generateGuid(`${rid}|${sid}|${str}`);
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
        jobRequest && await this.jobStore.writeJob(jobRequest);
        if (jobResponse) {
            await this.jobStore.writeJob(jobResponse);
            const tm = await this.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
            await tm.processJob(jobResponse, jobRequest);
        }
    }

    makeTU(res, segment) {
        const { str, nstr, ...seg } = segment;
        const tu = {
            ...seg,
            src: str,
            contentType: res.contentType,
            rid: res.id,
            ts: new Date(res.modified).getTime(),
        };
        if (nstr !== undefined) {
            tu.nsrc = nstr;
        }
        if (res.prj !== undefined) {
            tu.prj = res.prj;
        }
        return tu;
    }

    // eslint-disable-next-line complexity
    async #internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        const sources = await this.source.getEntries();
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            tus: [],
        };
        minimumQuality ??= this.getMinimumQuality(job);
        const tm = await this.tmm.getTM(this.sourceLang, targetLang); // TODO: source language may vary by resource or unit, if supported
        const prjLeverage = {};
        const repetitionMap = {};
        // eslint-disable-next-line no-unused-vars
        for (const [rid, res] of sources) {
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
            if (res.targetLangs.includes(targetLang)) {
                for (const seg of res.segments) {
                    // TODO: if segment is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                    const tmEntry = tm.getEntryByGuid(seg.guid);
                    const tu = this.makeTU(res, seg);
                    const plainText = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('') : tu.src;
                    const words = wordsCountModule.wordsCount(plainText);
                    // TODO: compatibility is actually stricter than GUID, this leads to extra translations that can't be stored
                    const isCompatible = sourceAndTargetAreCompatible(tu?.nsrc ?? tu?.src, tmEntry?.ntgt ?? tmEntry?.tgt);
                    if (!tmEntry || (!tmEntry.inflight && (!isCompatible || tmEntry.q < minimumQuality))) {
                        // if the same src is in flight already, mark it as an internal repetition
                        tm.getAllEntriesBySrc(tu.nsrc ?? tu.src).length > 0 && (repetitionMap[tu.src] = true);
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
        return [ job, { tmSize: tm.guids.length, minimumQuality, prjLeverage } ];
    }

    async prepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        return (await this.#internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }))[0];
    }

    async estimateTranslationJob({ targetLang }) {
        return (await this.#internalPrepareTranslationJob({ targetLang }))[1];
    }

    async prepareFilterBasedJob({ targetLang, tmBased, guidList }) {
        const tm = await this.tmm.getTM(this.sourceLang, targetLang);
        const sourceLookup = await this.getSourceAsTus();
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
        this.ctx.prj !== undefined && (tus = tus.filter(tu => this.ctx.prj.includes(tu.prj)));
        return {
            sourceLang: this.sourceLang,
            targetLang,
            tus,
        };
    }

    getTranslationProvider(jobManifest) {
        let translationProviderName = jobManifest.translationProvider;
        if (!translationProviderName) {
            for (const [ name, providerCfg ] of Object.entries(this.translationProviders)) {
                if (!providerCfg.pairs || (providerCfg.pairs[jobManifest.sourceLang] && providerCfg.pairs[jobManifest.sourceLang].includes(jobManifest.targetLang))) {
                    translationProviderName = name;
                    jobManifest.translationProvider = name;
                    break;
                }
            }
        }
        return this.translationProviders[translationProviderName];
    }

    async shutdown() {
        this.jobStore.shutdown && await this.jobStore.shutdown();
    }

}
