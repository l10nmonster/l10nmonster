import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';

export class JsonJobStore {
    constructor({ ctx, jobsDir }) {
        this.baseDir = ctx.baseDir;
        this.jobsDir = path.join(ctx.baseDir, jobsDir);
        if (!existsSync(this.jobsDir)) {
            mkdirSync(this.jobsDir);
        }
    }

    #jobsPathName() {
        return path.join(this.jobsDir, 'jobs.json');
    }

    #getJobManifests() {
        const jobsPath = this.#jobsPathName();
        return existsSync(jobsPath) ?
            JSON.parse(readFileSync(jobsPath, 'utf8')) :
            []
        ;
    }

    async getPendingJobs() {
        return this.#getJobManifests().filter(j => j.status === 'pending');
    }

    async getJobStatus(sourceLang, targetLang) {
        return this.#getJobManifests()
            .filter(j => j.sourceLang === sourceLang && j.targetLang === targetLang)
            .map(j => [ j.jobId, j.status ]);
    }

    async createJobManifest() {
        const jobs = this.#getJobManifests();
        const jobId = jobs.length;
        jobs.push({
            jobId,
            status: 'created',
        });
        await fs.writeFile(this.#jobsPathName(), JSON.stringify(jobs, null, '\t'), 'utf8');
        return jobId;
    }

    async updateJobManifest(jobManifest) {
        const jobs = this.#getJobManifests();
        jobManifest = {
            ...jobs[jobManifest.jobId],
            ...jobManifest,
            updatedAt: new Date().toISOString(),
        };
        jobs[jobManifest.jobId] = jobManifest;
        await fs.writeFile(this.#jobsPathName(), JSON.stringify(jobs, null, '\t'), 'utf8');
    }

    async updateJob(jobResponse) {
        const jobPath = path.join(this.jobsDir, `job_${jobResponse.jobId}.json`);
        await fs.writeFile(jobPath, JSON.stringify(jobResponse, null, '\t'), 'utf8');
    }

    async getJob(jobId) {
        const jobPath = path.join(this.jobsDir, `job_${jobId}.json`);
        return JSON.parse(await fs.readFile(jobPath, 'utf8'));
    }
}
