import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    unlinkSync,
    statSync,
} from 'fs';
import { nanoid } from 'nanoid';
import { globbySync } from 'globby';

const statusPriority = { done: 0, pending: 1, req: 2 };
const jobFilenameRegex = /(?<provider>[^_]+)_(?<sourceLang>[^_]+)_(?<targetLang>[^_]+)_job_(?<guid>[0-9A-Za-z_-]+)-(?<status>req|pending|done)\.json$/;

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

    #findGlob(glob) {
        return globbySync(path.join(this.jobsBaseDir, '**', glob));
    }

    async getAvailableLangPairs() {
        const files = this.#findGlob(`*_job_*.json`);
        const pairs = new Map();
        for (const file of files) {
            const entry = file.match(jobFilenameRegex)?.groups;
            entry && pairs.set(`${entry.sourceLang}_${entry.targetLang}`, [entry.sourceLang, entry.targetLang]);
        }
        return Array.from(pairs.values());
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        const files = this.#findGlob(`*${sourceLang}_${targetLang}_job_*.json`);
        const statusMap = {};
        for (const file of files) {
            const entry = file.match(jobFilenameRegex)?.groups;
            if (entry) {
                if (!statusMap[entry.guid] || statusPriority[entry.status] < statusPriority[statusMap[entry.guid].status]) {
                    statusMap[entry.guid] = { mtime: statSync(file).mtime.toISOString(), status: entry.status };
                }
            }
        }
        return Object.entries(statusMap);
    }

    async createJobManifest() {
        return {
            jobGuid: this.ctx.regression ? `xxx${this.#findGlob('*job_*-req.json').length}xxx` : nanoid(),
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
        const pending = this.#findGlob(`*job_${jobGuid}-pending.json`)[0];
        const done = this.#findGlob(`*job_${jobGuid}-done.json`)[0];
        const job = done ?? pending;
        return job ? JSON.parse(readFileSync(job, 'utf8')) : null;
    }

    async getJobRequest(jobGuid) {
        const req = this.#findGlob(`*job_${jobGuid}-req.json`)[0];
        return req ? JSON.parse(readFileSync(req, 'utf8')) : null;
    }

    async deleteJobRequest(jobGuid) {
        const req = this.#findGlob(`*job_${jobGuid}-req.json`)[0];
        return unlinkSync(req);
    }
}
