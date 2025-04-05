import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { createxliff12, xliff12ToJs } from 'xliff';
import { L10nContext, providers, logVerbose, logInfo } from '@l10nmonster/core';

export class XliffBridge extends providers.BaseTranslationProvider {
    /**
     * Initializes a new instance of the Repetition class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} options.quality - The quality to assign translations.
     * @param {function(string, string): string} options.requestPath - A function to compose the request path.
     * @param {function(string, string): string} options.completePath - A function to compose the complete path.
     */
    constructor({ requestPath, completePath, ...options }) {
        if (!requestPath || !completePath) {
            throw new Error('You must specify requestPath and completePath for XliffBridge');
        }
        super(options);
        this.requestPath = requestPath;
        this.completePath = completePath;
    }

    async start(job) {
        logVerbose`XliffBridge provider starting job ${job.jobGuid}`;
        const { tus, ...jobResponse } = await super.start(job);
        const notes = {};
        tus.forEach(tu => {
            if (tu.notes) {
                notes[tu.guid] = tu.notes;
            }
        });
        const xliff = await createxliff12(
            jobResponse.sourceLang,
            jobResponse.targetLang,
            Object.fromEntries(tus.map(tu => [ tu.guid, tu.nsrc[0] ])), // TODO: need to deal with nsrc properly
            null,
            'XliffBridge',
            null,
            notes,
        );
        if (xliff) {
            const prjPath = path.join(L10nContext.baseDir, this.requestPath(jobResponse.targetLang, jobResponse.jobGuid));
            await fs.mkdir(path.dirname(prjPath), {recursive: true});
            await fs.writeFile(prjPath, xliff, 'utf8');
            jobResponse.inflight = Object.values(tus).map(tu => tu.guid);
            jobResponse.status = 'pending';
        } else {
            jobResponse.status = 'blocked';
        }
        return jobResponse;
    }

    async continue(job) {
        job = await super.continue(job);
        const tus = [];
        const completePath = path.join(L10nContext.baseDir, this.completePath(job.targetLang, job.jobGuid));
        // const tuMap = pendingJob.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        if (existsSync(completePath)) {
            const translatedRes = await fs.readFile(completePath, 'utf8');
            const translations = await xliff12ToJs(translatedRes);
            for (const [guid, xt] of Object.entries(translations.resources.XliffBridge)) {
                if (xt?.target?.length > 0) {
                    tus.push({
                        guid,
                        ts: L10nContext.regression ? 1 : new Date().getTime(),
                        ntgt: [xt.target], // TODO: need to deal with ntgt properly
                        q: this.quality,
                    });
                }
            }
        } else {
            logInfo`XliffBridge provider waiting for job ${job.jobGuid} to complete on path ${completePath}`;
        }
        job.inflight = job.inflight.filter(guid => !tus.find(tu => tu.guid === guid));
        return { ...job, tus, status: job.inflight.length === tus.length ? 'done' : 'pending' };
    }
}
