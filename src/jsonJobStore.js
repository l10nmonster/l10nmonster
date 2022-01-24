import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
} from 'fs';
import * as fs from 'fs/promises';

export class JsonJobStore {
    constructor({ jobsDir, logRequests }) {
        this.jobsDir = path.join(this.ctx.baseDir, jobsDir);
        if (!existsSync(this.jobsDir)) {
            mkdirSync(this.jobsDir, {recursive: true});
        }
        this.logRequests = logRequests;
    }

    #jobsPathName() {
        return path.join(this.jobsDir, 'jobs.json');
    }

    async getJobManifests(status) {
        const jobsPath = this.#jobsPathName();
        const manifests = existsSync(jobsPath) ?
            JSON.parse(readFileSync(jobsPath, 'utf8')) :
            []
        ;
        return status ?
            manifests.filter(j => j.status === status) :
            manifests
        ;
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        return (await this.getJobManifests())
            .filter(j => j.sourceLang === sourceLang && j.targetLang === targetLang)
            .map(j => [ j.jobId, j.status ]);
    }

    async createJobManifest() {
        const jobs = await this.getJobManifests();
        const jobId = jobs.length;
        jobs.push({
            jobId,
            status: 'created',
        });
        await fs.writeFile(this.#jobsPathName(), JSON.stringify(jobs, null, '\t'), 'utf8');
        return jobId;
    }

    async #updateJobManifest(jobManifest) {
        const jobs = await this.getJobManifests();
        jobManifest = {
            ...jobs[jobManifest.jobId],
            ...jobManifest,
            // updatedAt: new Date().toISOString(),
        };
        jobs[jobManifest.jobId] = jobManifest;
        await fs.writeFile(this.#jobsPathName(), JSON.stringify(jobs, null, '\t'), 'utf8');
    }

    async updateJob(jobResponse, jobRequest) {
        const jobPath = path.join(this.jobsDir, `job_${jobResponse.jobId}.json`);
        await fs.writeFile(jobPath, JSON.stringify(jobResponse, null, '\t'), 'utf8');
        if (jobRequest && this.logRequests) {
            const jobPath = path.join(this.jobsDir, `job_${jobResponse.jobId}-req.json`);
            await fs.writeFile(jobPath, JSON.stringify(jobRequest, null, '\t'), 'utf8');
        }
        // eslint-disable-next-line no-unused-vars
        const { inflight, tus, envelope, ...jobManifest } = jobResponse;
        await this.#updateJobManifest(jobManifest);
}

    async getJob(jobId) {
        const jobPath = path.join(this.jobsDir, `job_${jobId}.json`);
        return JSON.parse(await fs.readFile(jobPath, 'utf8'));
    }
}
