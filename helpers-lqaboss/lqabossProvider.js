import JSZip from 'jszip';
import { providers, logVerbose, styleString, opsManager } from '@l10nmonster/core';

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
        opsManager.registerOp(this.startReviewOp.bind(this), { opName: this.#opNames.startReviewOp, idempotent: false });
    }

    createTask(job) {
        logVerbose`LQABossProvider creating task for job ${job.jobGuid}`;
        return opsManager.createTask(this.id, this.#opNames.startReviewOp, { job });
    }

    async startReviewOp(op) {
        const { tus, ...jobResponse } = op.args.job;
        const zip = new JSZip();
        zip.file('job.json', JSON.stringify({
            ...jobResponse,
            tus: tus.map(tu => ({
                rid: tu.rid,
                sid: tu.sid,
                guid: tu.guid,
                nsrc: tu.nsrc,
                notes: tu.notes,
                ntgt: tu.ntgt,
                q: this.quality,
            })),
        }, null, 2));
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        const filename = `${jobResponse.jobGuid}.lqaboss`;
        await this.#storageDelegate.saveFile(filename, buffer);
        logVerbose`Saved LQABoss file ${filename} with ${tus.length} guids and ${buffer.length} bytes`;
        jobResponse.tus = []; // remove tus so that job is cancelled and won't be stored
        return jobResponse;
    }

    async info() {
        const info = await super.info();
        info.description.push(styleString`Storage delegate: ${this.#storageDelegate.toString()}`);
        return info;
    }
}
