import * as path from 'path';
import {
    existsSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';
import {
    createHash,
} from 'crypto';
import wordsCountModule from 'words-count';

import TMManager from './tmManager.js';
import { JsonJobStore } from '../stores/jsonJobStore.js';
import { getNormalizedString, flattenNormalizedSourceToOrdinal } from '../normalizers/util.js';

export default class MonsterManager {
    constructor({ monsterDir, monsterConfig, ctx }) {
        if (monsterDir && monsterConfig && monsterConfig.sourceLang && monsterConfig.translationProvider &&
             (monsterConfig.contentTypes || (monsterConfig.source && monsterConfig.resourceFilter && monsterConfig.target)) === undefined) {
            throw 'You must specify sourceLang, translationProvider, minimumQuality, contentTypes (or source+resourceFilter+target) in l10nmonster.mjs';
        } else {
            this.monsterDir = monsterDir;
            this.ctx = ctx;
            this.jobStore = monsterConfig.jobStore ?? new JsonJobStore({
                jobsDir: path.join('.l10nmonster', 'jobs'),
            });
            this.tmm = new TMManager({ monsterDir, jobStore: this.jobStore });
            this.stateStore = monsterConfig.stateStore;
            this.debug = monsterConfig.debug ?? {};
            this.sourceLang = monsterConfig.sourceLang;
            this.minimumQuality = monsterConfig.minimumQuality;
            this.qualifiedPenalty = monsterConfig.qualifiedPenalty;
            this.unqualifiedPenalty = monsterConfig.unqualifiedPenalty;
            this.translationProvider = monsterConfig.translationProvider;
            if (monsterConfig.contentTypes) {
                this.contentTypes = monsterConfig.contentTypes;
            } else {
                this.contentTypes = {
                    default: {
                        source: monsterConfig.source,
                        resourceFilter: monsterConfig.resourceFilter,
                        segmentDecorator: monsterConfig.segmentDecorator,
                        decoders: monsterConfig.decoders,
                        encoders: monsterConfig.encoders,
                        target: monsterConfig.target,
                    }
                };
            }
            this.sourceCachePath = path.join(monsterDir, 'sourceCache.json');
            this.sourceCache = existsSync(this.sourceCachePath) ?
                JSON.parse(readFileSync(this.sourceCachePath, 'utf8')) :
                { };
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

    async fetchResourceStats() {
        const combinedStats = [];
        for (const [ contentType, handler ] of Object.entries(this.contentTypes)) {
            const stats = await handler.source.fetchResourceStats();
            for (const res of stats) {
                res.contentType = contentType;
            }
            combinedStats.push(stats);
        }
        return combinedStats.flat(1);
    }

    async updateSourceCache() {
        const newCache = { };
        const stats = await this.fetchResourceStats();
        let dirty = stats.length !== Object.keys(this.sourceCache).length;
        for (const res of stats) {
            if (this.sourceCache[res.id]?.modified === res.modified) {
                newCache[res.id] = this.sourceCache[res.id];
            } else {
                dirty = true;
                const pipeline = this.contentTypes[res.contentType];
                const payload = await pipeline.source.fetchResource(res.id);
                let parsedRes = await pipeline.resourceFilter.parseResource({resource: payload, isSource: true});
                pipeline.segmentDecorator && (parsedRes = pipeline.segmentDecorator(parsedRes));
                res.segments = parsedRes.segments;
                for (const seg of res.segments) {
                    if (pipeline.decoders) {
                        const normalizedStr = getNormalizedString(seg.str, pipeline.decoders);
                        if (normalizedStr[0] !== seg.str) {
                            seg.nstr = normalizedStr;
                        }
                    }
                    seg.guid = this.generateFullyQualifiedGuid(res.id, seg.sid, seg.nstr ? flattenNormalizedSourceToOrdinal(seg.nstr) : seg.str);
                    seg.contentType = res.contentType;
                }
                newCache[res.id] = res;
            }
        }
        if (dirty) {
            this.verbose && console.log(`Updating ${this.sourceCachePath}...`);
            await fs.writeFile(this.sourceCachePath, JSON.stringify(newCache, null, '\t'), 'utf8');
            this.sourceCache = newCache;
        }
    }

    getSourceCacheEntries() {
        return Object.entries(this.sourceCache)
            // eslint-disable-next-line no-unused-vars
            .filter(([rid, res]) => (this.ctx.prj === undefined || res.prj === this.ctx.prj));
    }

    async processJob(jobResponse, jobRequest) {
        await this.jobStore.updateJob(jobResponse, jobRequest);
        const tm = await this.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
        await tm.processJob(jobResponse, jobRequest);
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

    async prepareTranslationJob({ targetLang, minimumQuality, leverage }) {
        const sources = this.getSourceCacheEntries();
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
                    if (!tmEntry || (tmEntry.q < minimumQuality && !tmEntry.inflight)) {
                        // if the same src is in flight already, mark it as an internal repetition
                        tm.getAllEntriesBySrc(tu.src).length > 0 && (repetitionMap[tu.src] = true);
                        if (repetitionMap[tu.src]) {
                            // TODO: there may be some edge cases were src is the same but contentType is different -- we may care or...
                            //       this may be a feature (e.g. we can reuse ios and android strings without placeholders)
                            leverageDetails.internalRepetitions++;
                            leverageDetails.internalRepetitionWords += words;
                            !leverage && job.tus.push(tu);
                        } else {
                            repetitionMap[tu.src] = true;
                            job.tus.push(tu);
                            leverageDetails.untranslated++;
                            leverageDetails.untranslatedChars += seg.str.length;
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
        job.leverage = { tmSize: tm.size, minimumQuality, prjLeverage };
        return job; // TODO: this should return a list of jobs to be able to handle multiple source languages
    }

    getTranslationProvider(jobManifest) {
        let translationProvider = this.translationProvider;
        if (typeof translationProvider === 'function') {
            translationProvider = translationProvider(jobManifest);
        }
        return translationProvider;
    }

    getTargetLangs(limitToLang, resourceStats) {
        let langs = [];
        // eslint-disable-next-line no-unused-vars
        resourceStats ??= this.getSourceCacheEntries().map(([rid, res]) => res);
        for (const res of resourceStats) {
            for (const targetLang of res.targetLangs) {
                !langs.includes(targetLang) && langs.push(targetLang);
            }
        }
        if (limitToLang) {
            if (langs.includes(limitToLang)) {
                langs = [ limitToLang ];
            } else {
                throw `Invalid language: ${limitToLang}`;
            }
        }
        return langs;
    }

    async shutdown() {
        this.jobStore.shutdown && await this.jobStore.shutdown();
        this.stateStore?.shutdown && await this.stateStore.shutdown();
    }

}
