import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { nanoid } from 'nanoid';
import { globbySync } from 'globby';

export class JsonJobStore {
    constructor({ jobsDir }) {
        this.jobsBaseDir = path.join(this.ctx.baseDir, jobsDir);
    }

    #jobsDirForPair(sourceLang, targetLang) {
        const jobsDir = path.join(this.jobsBaseDir, `${sourceLang}_${targetLang}`);
        if (!existsSync(jobsDir)) {
            mkdirSync(jobsDir, {recursive: true});
        }
        return jobsDir;
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        const files = globbySync(path.join(this.jobsBaseDir, '*', `*${sourceLang}_${targetLang}_job_*.json`));
        const statusMap = {};
        for (const file of files) {
            const entry = file.match(/job_(?<guid>[0-9A-Za-z_-]+)-(?<status>req|pending|done)\.json$/)?.groups;
            if (entry) {
                if (entry.status === 'done') {
                    statusMap[entry.guid] = 'done';
                } else if (![ 'pending', 'done' ].includes(statusMap[entry.guid])) {
                    statusMap[entry.guid] = entry.status;
                }
            }
        }
        return Object.entries(statusMap);
    }

    async createJobManifest() {
        return {
            jobGuid: this.ctx.regression ? `xxx${globbySync(path.join(this.jobsBaseDir, '*', '*job_*-req.json')).length}xxx` : nanoid(),
            status: 'created',
        };
    }

    async writeJob(job) {
        // eslint-disable-next-line no-nested-ternary
        const state = [ 'created', 'blocked' ].includes(job.status) ? 'req' : job.status;
        const filename = `${job.translationProvider}_${job.sourceLang}_${job.targetLang}_job_${job.jobGuid}-${state}.json`;
        const jobPath = path.join(this.#jobsDirForPair(job.sourceLang, job.targetLang), filename);
        if (existsSync(jobPath)) {
            throw `can't overwrite immutable job ${jobPath}`;
        } else {
            const updatedAt = (this.ctx.regression ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
            writeFileSync(jobPath, JSON.stringify({ ...job, updatedAt }, null, '\t'), 'utf8');
        }
    }

    async getJob(jobGuid) {
        const pending = globbySync(path.join(this.jobsBaseDir, '*', `*job_${jobGuid}-pending.json`))[0];
        const done = globbySync(path.join(this.jobsBaseDir, '*', `*job_${jobGuid}-done.json`))[0];
        const job = done ?? pending;
        return job ? JSON.parse(readFileSync(job, 'utf8')) : null;
    }

    async getJobRequest(jobGuid) {
        const req = globbySync(path.join(this.jobsBaseDir, '*', `*job_${jobGuid}-req.json`))[0];
        return req ? JSON.parse(readFileSync(req, 'utf8')) : null;
    }
}
