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
import { DummyJobStore } from './dummyJobStore.js';

export default class MonsterManager {
    constructor({ monsterDir, monsterConfig, verbose }) {
        this.monsterDir = monsterDir;
        this.monsterConfig = monsterConfig;
        this.verbose = verbose;
        const guidGenerator = this.monsterConfig.guidGenerator || ((rid, sid, str) => `${rid}|${sid}|${str}`);
        this.generateGuid = function generateGuid(rid, sid, str) {
            const sidContentHash = createHash('sha256');
            sidContentHash.update(guidGenerator(rid, sid, str), 'utf8');
            return sidContentHash.digest().toString('base64');
        };
        this.jobStore = monsterConfig.jobStore || new DummyJobStore();
        this.stateStore = monsterConfig.stateStore;
        this.debug = monsterConfig.debug || {};
        this.sourceLang = monsterConfig.sourceLang;
        this.sourceCachePath = path.join(monsterDir, 'sourceCache.json');
        this.sourceCache = existsSync(this.sourceCachePath) ? 
            JSON.parse(readFileSync(this.sourceCachePath, 'utf8')) :
            { };
        this.tmCache = {};
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
                    tu.guid = this.generateGuid(res.id, tu.sid, tu.str);
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

    #tmPathName(sourceLang, targetLang) {
        return path.join(this.monsterDir, `tmCache_${sourceLang}_${targetLang}.json`);
    }

    async #writeTM(sourceLang, targetLang) {
        const tmPath = this.#tmPathName(sourceLang, targetLang);
        this.verbose && console.log(`Updating ${tmPath}...`);
        await fs.writeFile(tmPath, JSON.stringify(this.tmCache[`${sourceLang}_${targetLang}`], null, '\t'), 'utf8');
    }

    #getTM(sourceLang, targetLang) {
        const langPair = `${sourceLang}_${targetLang}`;
        if (!this.tmCache[langPair]) {
            const tmPath = this.#tmPathName(sourceLang, targetLang);
            const tm = existsSync(tmPath) ? 
                JSON.parse(readFileSync(tmPath, 'utf8')) :
                {
                    jobStatus: {},
                    tus: {},
                }
            ;
            this.tmCache[langPair] = tm;
        }
        return this.tmCache[langPair];
    }

    async #updateTM(sourceLang, targetLang) {
        const tm = this.#getTM(sourceLang, targetLang);
        const jobs = await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang);
        for (const [jobId, status] of jobs) {
            if (tm.jobStatus[jobId] !== status) {
                const job = await this.jobStore.getJob(jobId);
                await this.#processJob(job);
            }
        }
    }
    
    async #processJob(jobResponse, jobRequest) {
        const { inflight, tus, ...jobManifest } = jobResponse;
        jobManifest.inflightNum = inflight?.length || 0;
        await this.jobStore.updateJob(jobResponse, jobRequest);
        const tm = this.#getTM(jobResponse.sourceLang, jobResponse.targetLang);
        let dirty = tm.jobStatus[jobResponse.jobId] !== jobResponse.status;;
        if (inflight) {
            for (const guid of inflight) {
                if (!(guid in tm.tus)) {
                    tm.tus[guid] = { q: 0 };
                    dirty = true;
                }
            }
        }
        if (tus) {
            for (const tu of tus) {         
                if (!tm.tus[tu.guid] || tm.tus[tu.guid].q < tu.q) {
                    tm.tus[tu.guid] = {
                        str: tu.str,
                        q: tu.q,
                    };
                    dirty = true;
                }
            }
        }
        if (dirty) {
            tm.jobStatus[jobResponse.jobId] = jobResponse.status;
            await this.#writeTM(jobResponse.sourceLang, jobResponse.targetLang);
        }
        return tm;
    }

    async #createTranslator(sourceLang, targetLang) {
        await this.#updateTM(sourceLang, targetLang);
        const tm = this.#getTM(sourceLang, targetLang);
        const generateGuid = this.generateGuid;
        return async function translate(rid, sid, str) {
            const guid = generateGuid(rid, sid, str);
            if (!(guid in tm.tus)) {
                this.verbose && console.log(`Couldn't find ${sourceLang}_${targetLang} entry for ${rid}+${sid}+${str}`);
            }
            return tm.tus[guid]?.str || str; // falls back to source string (should not happen)
        }
    }

    async #prepareTranslationJob(targetLang) {
        const sources = Object.entries(this.sourceCache);
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            tus: [],
        };
        await this.#updateTM(this.sourceLang, targetLang);
        const tm = this.#getTM(this.sourceLang, targetLang); // TODO: source language may vary by resource or unit, if supported
        let translated = {},
            unstranslated = 0,
            unstranslatedChars = 0,
            unstranslatedWords = 0;
        for (const [rid, res] of sources) {
            for (const tu of res.translationUnits) {
                // TODO: if tu is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                if (!(tu.guid in tm.tus)) {
                    job.tus.push({
                        ...tu,
                        rid,
                    });
                    unstranslated++;
                    unstranslatedChars += tu.str.length;
                    unstranslatedWords += wordsCountModule.wordsCount(tu.str);
            } else {
                    translated[tm.tus[tu.guid].q] = (translated[tm.tus[tu.guid].q] || 0) + 1;
                }
            }
        }
        const tusNum = Object.keys(tm.tus).length;
        job.leverage = { translated, unstranslated, unstranslatedChars, unstranslatedWords, tusNum };
        return job; // TODO: this should return a list of jobs to be able to handle multiple source languages
    }

    #getTranslationProvider(jobManifest) {
        let translationProvider = this.monsterConfig.translationProvider;
        if (typeof translationProvider === 'function') {
            translationProvider = translationProvider(jobManifest);
        }
        return translationProvider;
    }

    async status(build, version) {
        await this.#updateSourceCache();
        const status = { 
            numSources: Object.keys(this.sourceCache).length,
            lang: {},
        };
        for (const targetLang of this.monsterConfig.targetLangs) {
            const job = await this.#prepareTranslationJob(targetLang);
            status.lang[targetLang] = job.leverage;
            if (build && version && this.stateStore) {
                // TODO: calculate passing grade based on config and add it to status
                await this.stateStore.updateBuildState(build, version, targetLang, job);
            }
        }
        status.pendingJobsNum = (await this.jobStore.getJobManifests('pending')).length;
        return status;
    }

    async push() {
        const status = [];
        await this.#updateSourceCache();
        for (const targetLang of this.monsterConfig.targetLangs) {
            const job = await this.#prepareTranslationJob(targetLang);
            if (Object.keys(job.tus).length > 0) {
                const jobId = await this.jobStore.createJobManifest();
                job.jobId = jobId;
                const translationProvider = this.#getTranslationProvider(job);
                if (translationProvider) {
                    job.translationProvider = translationProvider.constructor.name;
                    const jobResponse = await translationProvider.requestTranslations(job);
                    await this.#processJob(jobResponse, job);
                    status.push({
                        num: jobResponse.tus?.length || jobResponse.inflight?.length || 0,
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
            const job = await this.#prepareTranslationJob(lang);
            if (Object.keys(job.tus).length > 0) {
                const translations = [];
                const txCache = {};
                for (const tu of job.tus) {
                    if (!txCache[tu.rid]) {
                        const lookup = {};
                        let resource;
                        try {
                            resource = await pipeline.target.fetchTranslatedResource(lang, tu.rid);
                        } catch {
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
                        translations.push({
                            guid: tu.guid,
                            str: previousTranslation,
                            q: quality
                        });
                    }
                }
                job.tus = translations;
                job.status = 'done';
                job.translationProvider = 'Grandfather';
                job.jobId = await this.jobStore.createJobManifest();
                await this.#processJob(job);
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
            const translator = await this.#createTranslator(this.sourceLang, lang);
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
