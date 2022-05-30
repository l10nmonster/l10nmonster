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
        const files = globbySync(path.join(this.jobsBaseDir, '*', `${sourceLang}_${targetLang}_job_*.json`));
        const statusMap = {};
        for (const file of files) {
            const entry = file.match(/job_(?<guid>[0-9A-Za-z_-]+)-(?<status>req|wip|done)\.json$/)?.groups;
            if (entry) {
                if (entry.status === 'done') {
                    statusMap[entry.guid] = 'done';
                } else if (![ 'wip', 'done' ].includes(statusMap[entry.guid])) {
                    statusMap[entry.guid] = entry.status;
                }
            }
        }
        return Object.entries(statusMap);
    }

    async getWIPJobs(sourceLang, targetLang) {
        const jobStatus = await this.getJobStatusByLangPair(sourceLang, targetLang);
        return jobStatus.filter(e => e[1] === 'wip').map(e => e[0]);
    }

    async createJobManifest() {
        return {
            jobGuid: this.ctx.regression ? `xxx${globbySync(path.join(this.jobsBaseDir, '*', '*job_*-req.json')).length}xxx` : nanoid(),
            status: 'created',
        };
    }

    // TODO: convert this to a create-only method (check if it exists, then throw)
    async updateJob(jobResponse, jobRequest) {
        const updatedAt = (this.ctx.regression ? new Date('2022-05-29T00:00:00.000Z') : new Date()).toISOString();
        const langPath = this.#jobsDirForPair(jobResponse.sourceLang, jobResponse.targetLang);
        const filename = `${jobResponse.sourceLang}_${jobResponse.targetLang}_job_${jobResponse.jobGuid}`;
        const jobPath = path.join(langPath, `${filename}-${jobResponse.status === 'done' ? 'done' : 'wip'}.json`);
        await writeFileSync(jobPath, JSON.stringify({ ...jobResponse, updatedAt }, null, '\t'), 'utf8');
        if (jobRequest) {
            const jobPath = path.join(langPath, `${filename}-req.json`);
            await writeFileSync(jobPath, JSON.stringify({ ...jobRequest, updatedAt }, null, '\t'), 'utf8');
        }
    }

    async getJob(jobGuid) {
        const wip = globbySync(path.join(this.jobsBaseDir, '*', `*job_${jobGuid}-wip.json`))[0];
        const done = globbySync(path.join(this.jobsBaseDir, '*', `*job_${jobGuid}-done.json`))[0];
        const job = done ?? wip;
        return job ? JSON.parse(readFileSync(job, 'utf8')) : null;
    }

    async getJobRequest(jobGuid) {
        const req = globbySync(path.join(this.jobsBaseDir, '*', `*job_${jobGuid}-req.json`))[0];
        return req ? JSON.parse(readFileSync(req, 'utf8')) : null;
    }
}
