import JSZip from 'jszip';
import { getRegressionMode, providers, logVerbose, logInfo, styleString, utils, opsManager, logError, logWarn } from '@l10nmonster/core';

/**
 * @typedef {object} LQABossProviderOptions
 * @extends BaseTranslationProvider
 * @property {Object} delegate - Required file store delegate implementing file operations
 */

/**
 * Provider for LQA Boss.
 */
export class LQABossProvider extends providers.BaseTranslationProvider {
    #storageDelegate;
    #opNames = {};

    /**
     * Initializes a new instance of the LQABossProvider class.
     * @param {LQABossProviderOptions} options - Configuration options for the provider.
     */
    constructor({ delegate, ...options }) {
        super(options);
        this.#storageDelegate = delegate;
        this.#opNames.startReviewOp = `${this.id}.startReviewOp`;
        this.#opNames.continueReviewOp = `${this.id}.continueReviewOp`;
        this.#opNames.completeReviewOp = `${this.id}.completeReviewOp`;
        opsManager.registerOp(this.startReviewOp.bind(this), { opName: this.#opNames.startReviewOp, idempotent: false });
        opsManager.registerOp(this.continueReviewOp.bind(this), { opName: this.#opNames.continueReviewOp, idempotent: true });
        opsManager.registerOp(this.completeReviewOp.bind(this), { opName: this.#opNames.completeReviewOp, idempotent: true });
    }

    createTask(job) {
        logVerbose`LQABossProvider creating task for job ${job.jobGuid}`;
        const requestTranslationsTask = opsManager.createTask(this.id, this.#opNames.completeReviewOp);
        requestTranslationsTask.rootOp.enqueue(this.#opNames.startReviewOp, { job });
        return requestTranslationsTask;
    }

    async startReviewOp(op) {
        const { job } = op.args;
        const zip = new JSZip();
        zip.file('job.json', JSON.stringify(job, null, 2));
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const filename = `${job.jobGuid}.lqaboss`;
        await this.#storageDelegate.saveFile(filename, buffer);
        logVerbose`LQABoss file ${filename} with ${job.tus.length} guids and ${buffer.length} bytes saved`;
        op.parentTask.rootOp.enqueue(this.#opNames.continueReviewOp, { jobGuid: job.jobGuid });
    }

    /**
     * Fetches the completed review job. This will error out until the review is complete.
     * @param {object} op - The operation context containing fetch parameters.
     * @returns {Promise<*>} The job response.
     */
    async continueReviewOp(op) {
        const filename = `${op.args.jobGuid}.json`;
        logVerbose`Trying to fetch completed LQABoss file ${filename}`;
        return JSON.parse(await this.#storageDelegate.getFile(filename));
    }

    async completeReviewOp(op) {
        const { tus, ...jobResponse } = op.inputs[1]; // the second op should be continueReviewOp
        jobResponse.status = 'done';
        const ts = getRegressionMode() ? 1 : new Date().getTime();
        jobResponse.tus = tus.map(tu => ({ ...tu, ts, q: this.quality }));
        return jobResponse;
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Storage delegate: ${this.#storageDelegate.toString()}`);
        return info;
    }
}
