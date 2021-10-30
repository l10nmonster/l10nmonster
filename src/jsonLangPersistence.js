import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';

import {
    generateGuid,
} from './utils.js';  

export default class JsonLangPersistence {
    constructor({ monsterDir, monsterConfig }) {
        this.debug = monsterConfig.debug;
        this.targetLangs = monsterConfig.targetLangs;
        this.pipelines = monsterConfig.pipelines;
        this.langPaths = {};
        for (const lang of monsterConfig.targetLangs) {
            const baseDir = path.join(monsterDir, lang);
            if (!existsSync(baseDir)) {
                mkdirSync(baseDir);
            }
            this.langPaths[lang] = {
                baseDir,
                jobs: path.join(baseDir, 'jobs.json'),
                tm: path.join(baseDir, 'tm.json'),
            }
        }
    }

    getTM(lang) {
        const tmPath = this.langPaths[lang].tm;
        return existsSync(tmPath) ? 
            JSON.parse(readFileSync(tmPath, 'utf8')) :
            { inflight: {}, tus: {} }
        ;
    }

    getJobStatus(lang) {
        const jobsPath = this.langPaths[lang].jobs;
        return existsSync(jobsPath) ?
            JSON.parse(readFileSync(jobsPath, 'utf8')) :
            []
        ;
    }

    createTranslator(lang) {
        const tm = this.getTM(lang);
        return function translate(rid, sid, str) {
            const guid = generateGuid(rid, sid, str);
            if (!tm.tus[guid]) {
                console.log(`Couldn't find ${lang} entry for ${rid}+${sid}+${str}`);
            }
            return tm.tus[guid]?.str || str; // falls back to source string
        }
    }

    async updateTM(jobResponse) {
        const tm = this.getTM(jobResponse.targetLang);
        let dirty = false;
        if (jobResponse.inflight) {
            for (const guid of jobResponse.inflight) {
                if (tm.inflight[guid] !== jobResponse.jobId) {
                    tm.inflight[guid] = jobResponse.jobId;
                    dirty = true;
                }
            }
        }
        if (jobResponse.tus) {
            for (const tu of jobResponse.tus) {
                if (tm.inflight[tu.guid] === jobResponse.jobId) {
                    delete tm.inflight[tu.guid];
                    dirty = true;
                }                
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
            const tmPath = this.langPaths[jobResponse.targetLang].tm;
            console.log(`Updating ${tmPath}...`);
            await fs.writeFile(tmPath, JSON.stringify(tm, null, '\t'), 'utf8');
        }
        return tm;
    }

    async createJobManifest(targetLang) {
        const jobs = this.getJobStatus(targetLang);
        const jobId = jobs.length;
        jobs.push({
            jobId,
        });
        await fs.writeFile(this.langPaths[targetLang].jobs, JSON.stringify(jobs, null, '\t'), 'utf8');
        return jobId;
    }

    async updateJobManifest(jobManifest) {
        const jobs = this.getJobStatus(jobManifest.targetLang);
        jobManifest = {
            ...jobs[jobManifest.jobId],
            ...jobManifest,
            updatedAt: new Date().toISOString(),
        };
        jobs[jobManifest.jobId] = jobManifest;
        await fs.writeFile(this.langPaths[jobManifest.targetLang].jobs, JSON.stringify(jobs, null, '\t'), 'utf8');
    }

    async requestTranslationJob(pipelineName, job) {
        const pipeline = this.pipelines[pipelineName];
        const targetLang = job.targetLang;
        const langDir = this.langPaths[targetLang].baseDir;
        const jobId = await this.createJobManifest(targetLang);
        job.translationProvider = pipeline.translationProvider.constructor.name;
        job.jobId = jobId;

        let jobRequestPath;
        if (this.debug.logRequests) {
            jobRequestPath = path.join(langDir, `req-${new Date().toISOString()}.json`);
            fs.writeFileSync(jobRequestPath, JSON.stringify(job, null, '\t'), 'utf8');
        }
        let jobResponsePath;

        const jobResponse = await pipeline.translationProvider.requestTranslations(job);
        if (this.debug.logResponses) {
            jobResponsePath = path.join(langDir, `res-${new Date().toISOString()}.json`);
            fs.writeFileSync(jobResponsePath, JSON.stringify(jobResponse, null, '\t'), 'utf8');
        }
        await this.updateJobManifest({
            jobId,
            targetLang,
            translationProvider: job.translationProvider,
            requestedAt: new Date().toISOString(),
            requestPayload: jobRequestPath,
            responsePayload: jobResponsePath,
            status: jobResponse.status,
            inflightNum: jobResponse.inflight?.length || 0,
        });
        return jobResponse;
    }
}
