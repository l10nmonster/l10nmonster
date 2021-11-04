import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';

export default class JsonLangPersistence {
    constructor({ monsterDir, monsterConfig }) {
        this.debug = monsterConfig.debug;
        this.targetLangs = monsterConfig.targetLangs;
        this.pipelines = monsterConfig.pipelines;
        this.generateGuid = monsterConfig.generateGuid;
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
            { tus: {} }
        ;
    }

    #getJobManifests(lang) {
        const jobsPath = this.langPaths[lang].jobs;
        return existsSync(jobsPath) ?
            JSON.parse(readFileSync(jobsPath, 'utf8')) :
            []
        ;
    }

    async getPendingJobs(lang) {
        return this.#getJobManifests(lang).filter(j => j.status === 'pending');
    }

    createTranslator(lang) {
        const tm = this.getTM(lang);
        return async function translate(rid, sid, str) {
            const guid = this.generateGuid(rid, sid, str);
            if (!tm.tus[guid]) {
                console.error(`Couldn't find ${lang} entry for ${rid}+${sid}+${str}`);
            }
            return tm.tus[guid]?.str || str; // falls back to source string
        }
    }

    async updateTM(jobResponse) {
        // TODO: maybe response logging should be done here so that we also log pulls
        if (this.debug.logResponses) {
            const jobResponsePath = path.join(this.langPaths[jobResponse.targetLang].baseDir, `res-${new Date().toISOString()}.json`);
            await fs.writeFile(jobResponsePath, JSON.stringify(jobResponse, null, '\t'), 'utf8');
        }
        const tm = this.getTM(jobResponse.targetLang);
        let dirty = false;
        if (jobResponse.inflight) {
            for (const guid of jobResponse.inflight) {
                if (!(guid in tm.tus)) {
                    tm.tus[guid] = { q: '000-pending' };
                    dirty = true;
                }
            }
        }
        if (jobResponse.tus) {
            for (const tu of jobResponse.tus) {         
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
        const jobs = this.#getJobManifests(targetLang);
        const jobId = jobs.length;
        jobs.push({
            jobId,
            status: 'created',
        });
        await fs.writeFile(this.langPaths[targetLang].jobs, JSON.stringify(jobs, null, '\t'), 'utf8');
        return jobId;
    }

    async updateJobManifest(jobManifest) {
        const jobs = this.#getJobManifests(jobManifest.targetLang);
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
            await fs.writeFile(jobRequestPath, JSON.stringify(job, null, '\t'), 'utf8');
        }
        const jobResponse = await pipeline.translationProvider.requestTranslations(job);
        await this.updateJobManifest({
            jobId,
            targetLang,
            translationProvider: job.translationProvider,
            requestedAt: new Date().toISOString(),
            requestPayload: jobRequestPath,
            status: jobResponse.status,
            inflightNum: jobResponse.inflight?.length || 0,
        });
        return jobResponse;
    }
}
