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
import { diffJson } from 'diff';

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const color = { red: '\x1b[31m', green: '\x1b[32m', reset: '\x1b[0m' };

import TMManager from './tmManager.js';
import { JsonJobStore } from './jsonJobStore.js';

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
        this.jobStore = monsterConfig.jobStore ?? new JsonJobStore({
            jobsDir: path.join('.l10nmonster', 'jobs'),
        });
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
        if (minimumQuality === undefined) {
            throw 'You must specify a minimum quality in your config';
        } else {
            return minimumQuality;
        }
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
                res.segments = parsedRes.segments;
                for (const seg of res.segments) {
                    seg.guid = generateFullyQualifiedGuid(res.id, seg.sid, seg.str);
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
        await tm.processJob(jobResponse, jobRequest);
    }

    async #prepareTranslationJob(targetLang, minimumQuality) {
        const sources = Object.entries(this.sourceCache);
        const job = {
            sourceLang: this.sourceLang,
            targetLang,
            tus: [],
        };
        minimumQuality ??= this.#getMinimumQuality(job);
        const tm = await this.tmm.getTM(this.sourceLang, targetLang); // TODO: source language may vary by resource or unit, if supported
        let translated = {},
            untranslated = 0,
            untranslatedChars = 0,
            untranslatedWords = 0,
            pending = 0;
        for (const [rid, res] of sources) {
            for (const { str, ...seg } of res.segments) {
                // TODO: if segment is pluralized we need to generate/suppress the relevant number of variants for the targetLang
                const tmEntry = tm.getEntryByGuid(seg.guid);
                if (!tmEntry || (tmEntry.q < minimumQuality && !tmEntry.inflight)) {
                    job.tus.push({
                        ...seg,
                        src: str,
                        rid,
                        ts: new Date(res.modified).getTime(),
                    });
                    untranslated++;
                    untranslatedChars += str.length;
                    untranslatedWords += wordsCountModule.wordsCount(str);
                } else {
                    if (tmEntry.inflight) {
                        pending++;
                    } else {
                        translated[tmEntry.q] = (translated[tmEntry.q] ?? 0) + 1;
                    }
                }
            }
        }
        const tmSize = tm.size;
        job.leverage = { minimumQuality, translated, untranslated, untranslatedChars, untranslatedWords, pending, tmSize };
        return job; // TODO: this should return a list of jobs to be able to handle multiple source languages
    }

    #getTranslationProvider(jobManifest) {
        let translationProvider = this.monsterConfig.translationProvider;
        if (typeof translationProvider === 'function') {
            translationProvider = translationProvider(jobManifest);
        }
        return translationProvider;
    }

    #getTargetLangs(limitToLang, resourceStats) {
        let langs = [];
        resourceStats ??= Object.values(this.sourceCache);
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

    async status(minimumQuality) {
        await this.#updateSourceCache();
        const status = {
            numSources: Object.keys(this.sourceCache).length,
            lang: {},
        };
        const targetLangs = this.#getTargetLangs();
        for (const targetLang of targetLangs) {
            const job = await this.#prepareTranslationJob(targetLang, minimumQuality);
            const unstranslatedContent = {};
            for (const tu of job.tus) {
                unstranslatedContent[tu.rid] ??= {};
                unstranslatedContent[tu.rid][tu.sid] = tu.src;
            }
            status.lang[targetLang] = {
                leverage: job.leverage,
                unstranslatedContent,
            };
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
        const qualifiedMatches = {}; // sid+src
        const unqualifiedMatches = {}; // src only
        let numStrings = 0;
        let totalWC = 0;
        const smellyRegex = /[^a-zA-Z 0-9.,;:!()\-']/;
        const smelly = [];
        for (const [rid, res] of sources) {
            for (const seg of res.segments) {
                numStrings++;
                const wc = wordsCountModule.wordsCount(seg.str);
                totalWC += wc;
                const qGuid = generateSidQualifiedGuid(seg.sid, seg.str);
                unqualifiedMatches[seg.str] = unqualifiedMatches[seg.str] ?? [];
                unqualifiedMatches[seg.str].push({ rid, sid: seg.sid, str: seg.str, wc, qGuid });
                qualifiedMatches[qGuid] = qualifiedMatches[qGuid] ?? [];
                qualifiedMatches[qGuid].push({ rid, sid: seg.sid, str: seg.str, wc });
                if (smellyRegex.test(seg.str)) {
                    smelly.push({ rid, sid: seg.sid, str: seg.str });
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
        const targetLangs = this.#getTargetLangs();
        for (const targetLang of targetLangs) {
            const jobBody = await this.#prepareTranslationJob(targetLang);
            if (Object.keys(jobBody.tus).length > 0) {
                const manifest = await this.jobStore.createJobManifest();
                const jobRequest = {
                    ...jobBody,
                    ...manifest,
                };
                const translationProvider = this.#getTranslationProvider(jobRequest);
                if (translationProvider) {
                    jobRequest.translationProvider = translationProvider.constructor.name;
                    // this may return a "jobResponse" if syncronous or a "jobManifest" if asynchronous
                    const job = await translationProvider.requestTranslations(jobRequest);
                    await this.#processJob(job, jobRequest);
                    status.push({
                        num: job.tus?.length ?? job.inflight?.length ?? 0,
                        lang: job.targetLang,
                        status: job.status
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
        await this.#updateSourceCache();
        const targetLangs = this.#getTargetLangs(limitToLang);
        const status = [];
        for (const lang of targetLangs) {
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
                            parsedResource.segments.forEach(seg => lookup[seg.sid] = seg.str);
                        }
                    }
                    txCache[tu.rid] = lookup;
                }
                const previousTranslation = txCache[tu.rid][tu.sid];
                if (previousTranslation !== undefined) {
                    sources.push(tu);
                    translations.push({
                        guid: tu.guid,
                        rid: tu.rid,
                        sid: tu.sid,
                        src: tu.src,
                        tgt: previousTranslation,
                        q: quality,
                    });
                }
            }
            this.verbose && console.log(`Grandfathering ${lang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} existing`);
            if (translations.length > 0) {
                // eslint-disable-next-line no-unused-vars
                const { tus, ...jobResponse } = jobRequest;
                jobRequest.tus = sources;
                jobResponse.tus = translations;
                jobResponse.status = 'done';
                jobResponse.translationProvider = 'Grandfather';
                const manifest = await this.jobStore.createJobManifest();
                await this.#processJob({ ...jobResponse, ...manifest }, { ...jobRequest, ...manifest });
                status.push({
                    num: translations.length,
                    lang,
                });
            }
        }
        return status;
    }

    // this is similar to grandfather using translations of identical strings in different files (qualified)
    // or different segments (unqualified)
    async leverage(qualifiedQuality, unqualifiedQuality, limitToLang) {
        await this.#updateSourceCache();
        const targetLangs = this.#getTargetLangs(limitToLang);
        const status = [];
        for (const lang of targetLangs) {
            const tm = await this.tmm.getTM(this.sourceLang, lang);
            const jobRequest = await this.#prepareTranslationJob(lang);
            const sources = [];
            const translations = [];
            for (const tu of jobRequest.tus) {
                const tuCandidates = tm.getAllEntriesBySrc(tu.src);
                if (tuCandidates.length > 0) {
                    let bestCandidate = { q: 0, ts: 0 };
                    for (const candidate of tuCandidates) {
                        if (tu.sid === candidate.sid || tu.sid !== bestCandidate.sid) {
                            if (candidate.q > bestCandidate.q || (candidate.q === bestCandidate.q && candidate.ts > bestCandidate.ts)) {
                                bestCandidate = candidate;
                            }
                        }
                    }
                    const leveragedTU = {
                        ...bestCandidate,
                        rid: tu.rid,
                        sid: tu.sid,
                        guid: generateFullyQualifiedGuid(tu.rid, tu.sid, tu.src),
                        q: Math.min((tu.sid === bestCandidate.sid ? qualifiedQuality : unqualifiedQuality), bestCandidate.q),
                    };
                    sources.push(tu);
                    translations.push(leveragedTU);
                }
            }
            this.verbose && console.log(`Leveraging ${lang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} can be leveraged`);
            if (translations.length > 0) {
                // eslint-disable-next-line no-unused-vars
                const { tus, ...jobResponse } = jobRequest;
                const manifest = await this.jobStore.createJobManifest();
                jobRequest.tus = sources;
                translations.forEach(tu => tu.jobId = manifest.jobId);
                jobResponse.tus = translations;
                jobResponse.status = 'done';
                jobResponse.translationProvider = 'Repetition';
                await this.#processJob({ ...jobResponse, ...manifest }, { ...jobRequest, ...manifest });
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

    async translate({ limitToLang, dryRun }) {
        const pipeline = this.monsterConfig;
        const status = { generatedResources: {}, diff: {} };
        const resourceStats = await pipeline.source.fetchResourceStats();
        const resourceIds = resourceStats.map(rh => rh.id);
        const targetLangs = this.#getTargetLangs(limitToLang, resourceStats);
        for (const targetLang of targetLangs) {
            const verbose = this.verbose;
            const sourceLang = this.sourceLang;
            const tm = await this.tmm.getTM(sourceLang, targetLang);
            const translator = async function translate(rid, sid, src) {
                const guid = generateFullyQualifiedGuid(rid, sid, src);
                const entry = tm.getEntryByGuid(guid);
                !entry && verbose && console.log(`Couldn't find ${sourceLang}_${targetLang} entry for ${rid}+${sid}+${src}`);
                return entry?.tgt; // don't fall back, let the caller deal with it
            };
            status.generatedResources[targetLang] = [];
            status.diff[targetLang] = {};
            for (const resourceId of resourceIds) {
                const resource = await pipeline.source.fetchResource(resourceId);
                const translatedRes = await pipeline.resourceFilter.generateTranslatedResource({ resourceId, resource, targetLang, translator });
                const translatedResourceId = pipeline.target.translatedResourceId(targetLang, resourceId);
                if (dryRun) {
                    let currentRaw;
                    try {
                        currentRaw = await pipeline.target.fetchTranslatedResource(targetLang, resourceId);
                    } catch (e) {
                        console.error(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}`);
                    }
                    if (currentRaw) {
                        const currentParsed = await pipeline.resourceFilter.parseResource({ resource: currentRaw, isSource: false });
                        const currentFlattened = {};
                        currentParsed.segments.forEach(x => currentFlattened[x.sid] = x.str);
                        const newParsed = await pipeline.resourceFilter.parseResource({ resource: translatedRes, isSource: false });
                        const newFlattened = {};
                        newParsed.segments.forEach(x => newFlattened[x.sid] = x.str);
                        const diff = diffJson(currentFlattened, newFlattened)
                            .filter(x => x.added ?? x.removed)
                            .map(x => `${x.added ? `${color.green}+` : `${color.red}-`} ${x.value}${color.reset}`)
                            .join('');
                        diff && (status.diff[targetLang][translatedResourceId] = diff);
                    }
                } else {
                    await pipeline.target.commitTranslatedResource(targetLang, resourceId, translatedRes);
                    status.generatedResources[targetLang].push(translatedResourceId);
                }
            }
        }
        return status;
    }

    async shutdown() {
        this.jobStore.shutdown && await this.jobStore.shutdown();
        this.monsterConfig?.stateStore?.shutdown && await this.monsterConfig.stateStore.shutdown();
    }

}
