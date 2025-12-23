import JSZip from 'jszip';
import path from 'path';
import { readFileSync } from 'fs';
import { providers, logVerbose, styleString, opsManager, getBaseDir } from '@l10nmonster/core';

/**
 * @typedef {object} LQABossProviderOptions
 * @property {Object} delegate - Required file store delegate implementing file operations
 * @property {string} [urlPrefix] - Prefix for the LQA Boss URL
 * @property {string} [qualityFile] - Path to a quality model JSON file
 */

/**
 * Provider for LQA Boss.
 */
export class LQABossProvider extends providers.BaseTranslationProvider {
    #storageDelegate;
    urlPrefix;
    #qualityFilePath;
    #opNames = {};

    /**
     * Initializes a new instance of the LQABossProvider class.
     * @param {LQABossProviderOptions} options - Configuration options for the provider.
     */
    constructor({ delegate, urlPrefix, qualityFile, ...options }) {
        super(options);
        this.#storageDelegate = delegate;
        this.urlPrefix = urlPrefix;
        qualityFile && (this.#qualityFilePath = path.resolve(getBaseDir(), qualityFile));
        this.#opNames.startReviewOp = `${this.id}.startReviewOp`;
        opsManager.registerOp(this.startReviewOp.bind(this), { opName: this.#opNames.startReviewOp, idempotent: false });
    }

    createTask(job) {
        logVerbose`LQABossProvider creating task for job ${job.jobGuid}`;
        return opsManager.createTask(this.id, this.#opNames.startReviewOp, { job });
    }

    async startReviewOp(op) {
        const filename = op.args.job.jobName ?
            `${op.args.job.jobName.replace(/\s+/g, '_')}-${op.args.job.jobGuid.substring(0, 5)}.lqaboss` :
            `${op.args.job.jobGuid}.lqaboss`;
        const jobRequest = {
            ...op.args.job,
            statusDescription: `Created LQA Boss file ${this.urlPrefix ? `at ${this.urlPrefix}/${filename}` : `: ${filename}`}`,
            providerData: { quality: this.quality },
        };
        const zip = new JSZip();
        zip.file('job.json', JSON.stringify(jobRequest, null, 2));
        
        // Add quality model if configured
        if (this.#qualityFilePath) {
            const qualityModel = JSON.parse(readFileSync(this.#qualityFilePath, 'utf-8'));
            zip.file('quality.json', JSON.stringify(qualityModel, null, 2));
        }
        
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        await this.#storageDelegate.saveFile(filename, buffer);
        logVerbose`Saved LQABoss file ${filename} with ${jobRequest.tus.length} guids and ${buffer.length} bytes`;
        return {
            ...jobRequest,
            tus: [], // remove tus so that job is cancelled and won't be stored
        };
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Storage delegate: ${this.#storageDelegate.toString()}`);
        return info;
    }
}
