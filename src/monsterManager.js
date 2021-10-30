import * as path from 'path';
import {
    existsSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';
import wordsCountModule from 'words-count';

import {
    generateGuid,
} from './utils.js';  

export default class MonsterManager {
    constructor({ monsterDir, monsterConfig, ops }) {
        this.monsterDir = monsterDir;
        this.monsterConfig = monsterConfig;
        this.ops = ops;
        this.sourceLang = monsterConfig.sourceLang;
        this.sourceCachePath = path.join(monsterDir, 'sourceCache.json');
        this.sourceCache = existsSync(this.sourceCachePath) ? 
            JSON.parse(readFileSync(this.sourceCachePath, 'utf8')) :
            { };
    }

    async #updateSourceCache(pipelineName) {
        const pipeline = this.monsterConfig.pipelines[pipelineName];
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
                    tu.guid = generateGuid(res.id, tu.sid, tu.str);
                }
                newCache[res.id] = res;
            }
        }
        if (dirty) {
            console.log(`Updating ${this.sourceCachePath}...`);
            await fs.writeFile(this.sourceCachePath, JSON.stringify(newCache, null, '\t'), 'utf8');
            this.sourceCache = newCache;
        }
    }    

    #prepareTranslationJob(targetLang) {
        const tm = this.ops.getTM(targetLang);
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            tus: [],
        };
        for (const [rid, res] of Object.entries(this.sourceCache)) {
            for (const tu of res.translationUnits) {
                // TODO: if tu is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                if (!(tu.guid in tm.tus || tu.guid in tm.inflight)) {
                    job.tus.push({
                        ...tu,
                        rid,
                    });
                }
            }
        }
        return job;
    }

    async status(pipelineName) {
        await this.#updateSourceCache(pipelineName);
        const sources = Object.values(this.sourceCache);
        const status = { 
            numSources: sources.length,
            lang: {},
        };
        for (const targetLang of this.monsterConfig.targetLangs) {
            const tm = this.ops.getTM(targetLang);
            const tusNum = Object.keys(tm.tus).length;
            const tmChars = Object.values(tm.tus).reduce((p, c) => p + c.str.length, 0);
            let translated = {},
                inflight = 0,
                unstranslated = 0,
                unstranslatedChars = 0,
                unstranslatedWords = 0;
            for (const source of sources) {
                for (const tu of source.translationUnits) {
                    if (tu.guid in tm.tus) {
                        translated[tm.tus[tu.guid].q] = (translated[tm.tus[tu.guid].q] || 0) + 1;
                    } else if (tu.guid in tm.inflight) {
                        inflight++;
                    } else {
                        unstranslated++;
                        unstranslatedChars += tu.str.length;
                        unstranslatedWords += wordsCountModule.wordsCount(tu.str);
                    }
                }
            }
            const jobsSummary = {};
            for (const j of this.ops.getJobStatus(targetLang)) {
                jobsSummary[j.status] = (jobsSummary[j.status] || 0) + 1;
            }
            status.lang[targetLang] = { translated, inflight, unstranslated, unstranslatedChars, unstranslatedWords, jobsSummary, tusNum, tmChars };
        }
        return status;
    }

    async push(pipelineName) {
        const status = [];
        await this.#updateSourceCache(pipelineName);
        for (const targetLang of this.monsterConfig.targetLangs) {
            const job = this.#prepareTranslationJob(targetLang);
            if (Object.keys(job.tus).length > 0) {
                const jobResponse = await this.ops.requestTranslationJob(pipelineName, job);
                await this.ops.updateTM(jobResponse);
                status.push({
                    num: job.tus?.length || job.inflight?.length || 0,
                    lang: job.targetLang,
                    status: jobResponse.status
                });
            }
        }
        return status;
    }

    // this is similar to push, except that existing translations in resources but not in TM
    // are assumed to be in sync with source and imported into TM at the 050 quality level
    async grandfather(pipelineName) {
        const pipeline = this.monsterConfig.pipelines[pipelineName];
        const status = [];
        await this.#updateSourceCache(pipelineName);
        for (const lang of this.monsterConfig.targetLangs) {
            const job = this.#prepareTranslationJob(lang);
            if (Object.keys(job.tus).length > 0) {
                const translations = [];
                const txCache = {};
                for (const tu of job.tus) {
                    if (!txCache[tu.rid]) {
                        const resource = await pipeline.target.fetchTranslatedResource(lang, tu.rid);
                        const lookup = {};
                        const parsedResource = await pipeline.resourceFilter.parseResource({ resource, isSource: false });
                        parsedResource.translationUnits.forEach(tu => lookup[tu.sid] = tu.str);
                        txCache[tu.rid] = lookup;
                    }
                    const previousTranslation = txCache[tu.rid][tu.sid];
                    if (previousTranslation) {
                        translations.push({
                            guid: tu.guid,
                            str: previousTranslation,
                            q: '050-grandfather', // this is not very high because source and target may be out of sync
                        });
                    }
                }
                job.tus = translations;
                job.status = 'done';
                job.jobId = -1; // TODO: create an official job and log it so TM can be reconstructed with all jobs if wanted
                await this.ops.updateTM(job);
                status.push({
                    num: translations.length,
                    lang,
                });
            }
        }
        return status;
    }

    async pull(pipelineName) {
        const pipeline = this.monsterConfig.pipelines[pipelineName];
        const stats = { numPendingJobs: 0, translatedStrings: 0 };
        for (const lang of this.monsterConfig.targetLangs) {
            const jobs = this.ops.getJobStatus(lang).filter(j => j.status === 'pending');
            stats.numPendingJobs = jobs.length;
            for (const jobManifest of jobs) {
                // console.log(`Pulling job ${jobManifest.jobId}...`);
                const newTranslations = await pipeline.translationProvider.fetchTranslations(jobManifest);
                if (newTranslations) {
                    await this.ops.updateTM(newTranslations);
                    await this.ops.updateJobManifest({
                        jobId: newTranslations.jobId,
                        targetLang: newTranslations.targetLang,
                        status: newTranslations.status,
                    });
                    stats.translatedStrings += newTranslations.tus.length;
                }
            }
        }
        return stats;
    }

    async translate(pipelineName) {
        const pipeline = this.monsterConfig.pipelines[pipelineName];
        const status = [];
        const stats = await pipeline.source.fetchResourceStats();
        for (const lang of this.monsterConfig.targetLangs) {
            const translator = this.ops.createTranslator(lang);
            for (const resHandle of stats) {
                const resource = await pipeline.source.fetchResource(resHandle.id);
                const resourceId = resHandle.id;
                const translatedRes = await pipeline.resourceFilter.generateTranslatedResource({ resourceId, resource, lang, translator });
                await pipeline.target.commitTranslatedResource(lang, resourceId, translatedRes);
            }
        }
        return status;
    }
}