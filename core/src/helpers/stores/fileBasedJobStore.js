import { nanoid } from 'nanoid';
import { L10nContext } from '@l10nmonster/core';

const statusPriority = { done: 0, pending: 1, req: 2 };

class JsonFormatHandler {
    static ext = 'json';
    static jobFilenameRegex = /(?<provider>[^_]+)_(?<sourceLang>[^_]+)_(?<targetLang>[^_]+)_job_(?<guid>[0-9A-Za-z_-]+)-(?<status>req|pending|done)\.json$/;

    static serialize(job) {
        return JSON.stringify(job, null, '\t');
    }

    static deserialize(job) {
        return JSON.parse(job);
    }
}

export class FileBasedJobStore {
    constructor(delegate, formatHandler) {
        if (!delegate) {
            throw 'A delegate is required to instantiate a FileBasedJobStore';
        }
        this.delegate = delegate;
        this.formatHandler = formatHandler ?? JsonFormatHandler;
    }

    async #findGlob(glob) {
        await this.delegate.ensureBaseDirExists();
        const allFiles = await this.delegate.listAllFiles();
        const globRegex = RegExp(glob.replaceAll('.', '\\.').replaceAll('*', '.*'));
        return allFiles.filter(filename => globRegex.test(filename));
    }

    async getAvailableLangPairs() {
        const files = await this.#findGlob(`*_job_*.${this.formatHandler.ext}`);
        const pairs = new Map();
        for (const file of files) {
            const entry = file.match(this.formatHandler.jobFilenameRegex)?.groups;
            entry && pairs.set(`${entry.sourceLang}_${entry.targetLang}`, [entry.sourceLang, entry.targetLang]);
        }
        return Array.from(pairs.values());
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        const files = await this.#findGlob(`*${sourceLang}_${targetLang}_job_*.${this.formatHandler.ext}`);
        const handleMap = {};
        for (const file of files) {
            const entry = file.match(this.formatHandler.jobFilenameRegex)?.groups;
            if (entry) {
                const handle = handleMap[entry.guid] ?? {};
                const currentPriority = statusPriority[handle.status] ?? 100;
                statusPriority[entry.status] < currentPriority && (handle.status = entry.status);
                handle[entry.status] = file;
                handleMap[entry.guid] = handle;
            }
        }
        return Object.entries(handleMap);
    }

    async createJobManifest() {
        return {
            jobGuid: L10nContext.regression ? `xxx${(await this.#findGlob(`*job_*-req.${this.formatHandler.ext}`)).length}xxx` : nanoid(),
            status: 'created',
        };
    }

    async writeJob(job) {
        const state = [ 'created', 'blocked' ].includes(job.status) ? 'req' : job.status;
        const filename = `${job.translationProvider}_${job.sourceLang}_${job.targetLang}_job_${job.jobGuid}-${state}.${this.formatHandler.ext}`;
        const jobPath = [ `${job.sourceLang}_${job.targetLang}`, filename ];
        await this.delegate.saveFile(jobPath, this.formatHandler.serialize(job), 'utf8');
    }

    async getJobByHandle(jobFilename) {
        const jobFile = await this.delegate.getFile(jobFilename);
        const parsedJob = this.formatHandler.deserialize(jobFile);
        return parsedJob;
    }

    async getJob(jobGuid) {
        const pending = (await this.#findGlob(`*job_${jobGuid}-pending.${this.formatHandler.ext}`))[0];
        const done = (await this.#findGlob(`*job_${jobGuid}-done.${this.formatHandler.ext}`))[0];
        const jobFilename = done ?? pending;
        return jobFilename ? this.getJobByHandle(jobFilename) : null;
    }

    async getJobRequestByHandle(jobFilename) {
        return jobFilename ? this.formatHandler.deserialize(await this.delegate.getFile(jobFilename, 'utf8')) : null;
    }

    async getJobRequest(jobGuid) {
        const reqFilename = (await this.#findGlob(`*job_${jobGuid}-req.${this.formatHandler.ext}`))[0];
        return reqFilename ? this.getJobRequestByHandle(reqFilename) : null;
    }

    async deleteJobRequest(jobGuid) {
        const reqFilename = (await this.#findGlob(`*job_${jobGuid}-req.${this.formatHandler.ext}`))[0];
        return await this.delegate.deleteFiles([ reqFilename]);
    }
}
