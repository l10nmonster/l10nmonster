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
import { DummyJobStore } from './dummyJobStore.js';

function generateSidQualifiedGuid(sid, str) {
    const sidContentHash = createHash('sha256');
    sidContentHash.update(`${sid}|${str}`, 'utf8');
    return sidContentHash.digest().toString('base64');
}

function generateFullyQualifiedGuid(rid, sid, str) {
    const sidContentHash = createHash('sha256');
    sidContentHash.update(`${rid}|${sid}|${str}`, 'utf8');
    return sidContentHash.digest().toString('base64');
}

export default class MonsterManager {
    constructor({ monsterDir, monsterConfig, build, release }) {
        this.monsterDir = monsterDir;
        this.monsterConfig = monsterConfig;
        this.build = build;
        this.release = release;
        this.jobStore = monsterConfig.jobStore ?? new DummyJobStore();
        this.tmm = new TMManager({ monsterDir, jobStore: this.jobStore });
        this.stateStore = monsterConfig.stateStore;
        this.debug = monsterConfig.debug ?? {};
        this.sourceLang = monsterConfig.sourceLang;
        this.sourceCachePath = path.join(monsterDir, 'sourceCache.json');
        this.sourceCache = existsSync(this.sourceCachePath) ? 
            JSON.parse(readFileSync(this.sourceCachePath, 'utf8')) :
            { };
    }

    #getMinimumQuality(jobManifest) {
        let minimumQuality = this.monsterConfig.minimumQuality;
        if (typeof minimumQuality === 'function') {
            minimumQuality = minimumQuality(jobManifest);
        }
        return minimumQuality ?? 50;
    }

    async #updateSourceCache() {
        const pipeline = this.monsterConfig;
        const newCache = { };
        const stats = await pipeline.source.fetchResourceStats();
        let dirty = stats.length !== Object.keys(this.sourceCache).length;
        for (const res of stats) {
            if (this.sourceCache[res.id]?.modified === res.modified) {
                newCache[res.id] = this.sourceCache[res.id];
            } else {
                dirty = true;
                const payload = await pipeline.source.fetchResource(res.id);
                const parsedRes = await pipeline.resourceFilter.parseResource({resource: payload, isSource: true});
                res.translationUnits = parsedRes.translationUnits;
                for (const tu of res.translationUnits) {
                    tu.guid = generateFullyQualifiedGuid(res.id, tu.sid, tu.str);
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


    
    async #processJob(jobResponse, jobRequest) {
        await this.jobStore.updateJob(jobResponse, jobRequest);
        const tm = await this.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
        await tm.processJob(jobResponse);
        return tm;
    }

    async #prepareTranslationJob(targetLang) {
        const sources = Object.entries(this.sourceCache);
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            ts: new Date().getTime(),
            tus: [],
        };
        const minimumQuality = this.#getMinimumQuality(job);
        const tm = await this.tmm.getTM(this.sourceLang, targetLang); // TODO: source language may vary by resource or unit, if supported
        let translated = {},
            unstranslated = 0,
            unstranslatedChars = 0,
            unstranslatedWords = 0;
        for (const [rid, res] of sources) {
            for (const tu of res.translationUnits) {
                // TODO: if tu is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                const tmEntry = tm.getEntry(rid, tu.sid, tu.str);
                if (!tmEntry || tmEntry.q < minimumQuality) {
                    job.tus.push({
                        ...tu,
                        rid,
                    });
                    unstranslated++;
                    unstranslatedChars += tu.str.length;
                    unstranslatedWords += wordsCountModule.wordsCount(tu.str);
            } else {
                    translated[tmEntry.q] = (translated[tmEntry.q] ?? 0) + 1;
                }
            }
        }
        const tmSize = tm.size;
        job.leverage = { minimumQuality, translated, unstranslated, unstranslatedChars, unstranslatedWords, tmSize };
        return job; // TODO: this should return a list of jobs to be able to handle multiple source languages
    }

    #getTranslationProvider(jobManifest) {
        let translationProvider = this.monsterConfig.translationProvider;
        if (typeof translationProvider === 'function') {
            translationProvider = translationProvider(jobManifest);
        }
        return translationProvider;
    }

    async status() {
        await this.#updateSourceCache();
        const status = { 
            numSources: Object.keys(this.sourceCache).length,
            lang: {},
        };
        for (const targetLang of this.monsterConfig.targetLangs) {
            const job = await this.#prepareTranslationJob(targetLang);
            status.lang[targetLang] = job.leverage;
            if (this.build && this.release && this.stateStore) {
                // TODO: calculate passing grade based on config and add it to status
                await this.stateStore.updateBuildState(this.build, this.release, targetLang, job);
            }
        }
        status.pendingJobsNum = (await this.jobStore.getJobManifests('pending')).length;
        return status;
    }

    async analyze() {
        await this.#updateSourceCache();
        const sources = Object.entries(this.sourceCache);
        const qualifiedMatches = {}; // sid+str
        const unqualifiedMatches = {}; // str only
        let numStrings = 0;
        let totalWC = 0;
        const smellyRegex = /[^a-zA-Z 0-9\.\,\;\:\!\(\)\-\']/;
        const smelly = [];
        for (const [rid, res] of sources) {
            for (const tu of res.translationUnits) {
                numStrings++;
                const wc = wordsCountModule.wordsCount(tu.str);
                totalWC += wc;
                const qGuid = generateSidQualifiedGuid(tu.sid, tu.str);
                unqualifiedMatches[tu.str] = unqualifiedMatches[tu.str] ?? [];
                unqualifiedMatches[tu.str].push({ rid, sid: tu.sid, str: tu.str, wc, qGuid });
                qualifiedMatches[qGuid] = qualifiedMatches[qGuid] ?? [];
                qualifiedMatches[qGuid].push({ rid, sid: tu.sid, str: tu.str, wc });
                if (smellyRegex.test(tu.str)) {
                    smelly.push({ rid, sid:tu.sid, str:tu.str });
                }
            }
        }
        for (const [k, v] of Object.entries(unqualifiedMatches)) {
            v.length === 1 && delete unqualifiedMatches[k]
        }
        for (const [k, v] of Object.entries(qualifiedMatches)) {
            v.length === 1 && delete qualifiedMatches[k]
        }
        return { 
            numSources: sources.length,
            numStrings,
            totalWC,
            unqualifiedRepetitions: Object.values(unqualifiedMatches),
            qualifiedRepetitions: Object.values(qualifiedMatches),
            smelly,
        };
    }

    async push() {
        const status = [];
        await this.#updateSourceCache();
        for (const targetLang of this.monsterConfig.targetLangs) {
            const jobRequest = await this.#prepareTranslationJob(targetLang);
            if (Object.keys(jobRequest.tus).length > 0) {
                const jobId = await this.jobStore.createJobManifest();
                jobRequest.jobId = jobId;
                const translationProvider = this.#getTranslationProvider(jobRequest);
                if (translationProvider) {
                    jobRequest.translationProvider = translationProvider.constructor.name;
                    const jobResponse = await translationProvider.requestTranslations(jobRequest);
                    await this.#processJob(jobResponse, jobRequest);
                    status.push({
                        num: jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0,
                        lang: jobResponse.targetLang,
                        status: jobResponse.status
                    });
                } else {
                    throw 'No translationProvider configured';
                }
            }
        }
        return status;
    }

    // this is similar to push, except that existing translations in resources but not in TM
    // are assumed to be in sync with source and imported into the TM
    async grandfather(quality, limitToLang) {
        const pipeline = this.monsterConfig;
        const status = [];
        await this.#updateSourceCache();
        let langs = this.monsterConfig.targetLangs;
        if (limitToLang) {
            if (langs.includes(limitToLang)) {
                langs = [ limitToLang ];
            } else {
                return {
                    error: 'Invalid Language'
                };
            }
        }
        for (const lang of langs) {
            const txCache = {};
            const jobRequest = await this.#prepareTranslationJob(lang);
            const sources = [];
            const translations = [];
            for (const tu of jobRequest.tus) {
                if (!txCache[tu.rid]) {
                    const lookup = {};
                    let resource;
                    try {
                        // this.verbose && console.log(`Getting ${tu.rid} for language ${lang}`);
                        resource = await pipeline.target.fetchTranslatedResource(lang, tu.rid);
                    } catch (e) {
                        console.error(`Couldn't fetch translated resource: ${e}`);
                    } finally {
                        if (resource) {
                            const parsedResource = await pipeline.resourceFilter.parseResource({ resource, isSource: false });
                            parsedResource.translationUnits.forEach(tu => lookup[tu.sid] = tu.str);
                        }
                    }
                    txCache[tu.rid] = lookup;
                }
                const previousTranslation = txCache[tu.rid][tu.sid];
                if (previousTranslation) {
                    sources.push(tu);
                    translations.push({
                        guid: tu.guid,
                        rid: tu.rid,
                        sid: tu.sid,
                        str: previousTranslation,
                        q: quality
                    });
                }
            }
            this.verbose && console.log(`Grandfathering ${lang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} existing`);
            if (translations.length > 0) {
                const { tus, ...jobResponse } = jobRequest;
                jobRequest.tus = sources;
                jobResponse.tus = translations;
                jobResponse.status = 'done';
                jobResponse.translationProvider = 'Grandfather';
                const jobId = await this.jobStore.createJobManifest();
                jobRequest.jobId = jobId;
                jobResponse.jobId = jobId;
                await this.#processJob(jobResponse, jobRequest);
                status.push({
                    num: translations.length,
                    lang,
                });    
            }
        }
        return status;
    }

    async pull() {
        const stats = { numPendingJobs: 0, translatedStrings: 0 };
        const pendingJobs = await this.jobStore.getJobManifests('pending');
        stats.numPendingJobs = pendingJobs.length;
        for (const jobManifest of pendingJobs) {
            this.verbose && console.log(`Pulling job ${jobManifest.jobId}...`);
            const translationProvider = this.#getTranslationProvider(jobManifest);
            const newTranslations = await translationProvider.fetchTranslations(jobManifest);
            if (newTranslations) {
                await this.#processJob(newTranslations);
                stats.translatedStrings += newTranslations.tus.length;
            }
        }
        return stats;
    }

    async translate() {
        const pipeline = this.monsterConfig;
        const status = [];
        const resourceIds = (await pipeline.source.fetchResourceStats()).map(rh => rh.id);
        for (const lang of this.monsterConfig.targetLangs) {
            const translator = (await this.tmm.getTM(this.sourceLang, lang)).translator;
            for (const resourceId of resourceIds) {
                const resource = await pipeline.source.fetchResource(resourceId);
                const translatedRes = await pipeline.resourceFilter.generateTranslatedResource({ resourceId, resource, lang, translator });
                await pipeline.target.commitTranslatedResource(lang, resourceId, translatedRes);
            }
        }
        return status;
    }

    async shutdown() {
        this.monsterConfig.jobStore.shutdown && await this.monsterConfig.jobStore.shutdown();
        this.monsterConfig?.stateStore?.shutdown && await this.monsterConfig.stateStore.shutdown();
    }

}
