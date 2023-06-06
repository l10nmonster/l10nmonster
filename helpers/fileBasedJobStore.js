const { nanoid } = require('nanoid');
const { sharedCtx } = require('.');

const statusPriority = { done: 0, pending: 1, req: 2 };
const jobFilenameRegex = /(?<provider>[^_]+)_(?<sourceLang>[^_]+)_(?<targetLang>[^_]+)_job_(?<guid>[0-9A-Za-z_-]+)-(?<status>req|pending|done)\.json$/;

module.exports = class FileBasedJobStore {
    constructor(delegate) {
        if (!delegate) {
            throw 'A delegate is required to instantiate a FileBasedJobStore';
        }
        this.delegate = delegate;
    }

    async #findGlob(glob) {
        await this.delegate.ensureBaseDirExists();
        const allFiles = await this.delegate.listAllFiles();
        const globRegex = RegExp(glob.replaceAll('.', '\\.').replaceAll('*', '.*'));
        return allFiles.filter(filename => globRegex.test(filename));
    }

    async getAvailableLangPairs() {
        const files = await this.#findGlob(`*_job_*.json`);
        const pairs = new Map();
        for (const file of files) {
            const entry = file.match(jobFilenameRegex)?.groups;
            entry && pairs.set(`${entry.sourceLang}_${entry.targetLang}`, [entry.sourceLang, entry.targetLang]);
        }
        return Array.from(pairs.values());
    }

    async getJobStatusByLangPair(sourceLang, targetLang) {
        const files = await this.#findGlob(`*${sourceLang}_${targetLang}_job_*.json`);
        const handleMap = {};
        for (const file of files) {
            const entry = file.match(jobFilenameRegex)?.groups;
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
            jobGuid: sharedCtx().regression ? `xxx${(await this.#findGlob('*job_*-req.json')).length}xxx` : nanoid(),
            status: 'created',
        };
    }

    async writeJob(job) {
        // eslint-disable-next-line no-nested-ternary
        const state = [ 'created', 'blocked' ].includes(job.status) ? 'req' : job.status;
        const filename = `${job.translationProvider}_${job.sourceLang}_${job.targetLang}_job_${job.jobGuid}-${state}.json`;
        const jobPath = [ `${job.sourceLang}_${job.targetLang}`, filename ];
        await this.delegate.saveFile(jobPath, JSON.stringify(job, null, '\t'), 'utf8');
    }

    async getJobByHandle(jobFilename) {
        const jobFile = await this.delegate.getFile(jobFilename);
        const parsedJob = JSON.parse(jobFile);
        return parsedJob;
    }

    async getJob(jobGuid) {
        const pending = (await this.#findGlob(`*job_${jobGuid}-pending.json`))[0];
        const done = (await this.#findGlob(`*job_${jobGuid}-done.json`))[0];
        const jobFilename = done ?? pending;
        return jobFilename ? this.getJobByHandle(jobFilename) : null;
    }

    async getJobRequestByHandle(jobFilename) {
        return jobFilename ? JSON.parse(await this.delegate.getFile(jobFilename, 'utf8')) : null;
    }

    async getJobRequest(jobGuid) {
        const reqFilename = (await this.#findGlob(`*job_${jobGuid}-req.json`))[0];
        return reqFilename ? this.getJobRequestByHandle(reqFilename) : null;
    }

    async deleteJobRequest(jobGuid) {
        const reqFilename = (await this.#findGlob(`*job_${jobGuid}-req.json`))[0];
        return await this.delegate.deleteFiles([ reqFilename]);
    }
}
