import { logVerbose } from '@l10nmonster/core';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * This provider prevents sending idendical sources for translation and holds them back for internal leverage later.
 */
export class InternalLeverageHoldout extends BaseTranslationProvider {
    /**
     * Initializes a new instance of the Repetition class.
     * @param {Object} [options] - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     */
    constructor(options = {}) {
        // @ts-ignore
        if (options.quality) {
            throw new Error('Fixed quality is not supported for InternalLeverageHoldout');
        }
        super(options);
    }

    async create(job) {
        logVerbose`InternalLeverageHoldout provider creating job`;
        job = await super.create(job);
        if (job.status === 'created' && job.tus.length > 0) {
            const gstrMap = {};
            const holdout = [];
            for (const tu of job.tus) {
                gstrMap[tu.gstr] ??= [];
                gstrMap[tu.gstr].push(tu);
            }
            const internalRepetitions = Object.values(gstrMap).filter(internalRepetition => internalRepetition.length > 1);
            for (const internalRepetition of internalRepetitions) {
                for (let i = 1; i < internalRepetition.length; i++) {
                    // TODO: this always chooses to send the first one to translation and repeat the rest
                    // need to have a better logic to accommodate penalties (e.g. the may bring q sub-par)
                    // and optimize (e.g. may want to prioritize segments with notes than those without)
                    holdout.push({
                        ...internalRepetition[i],
                        parentGuid: internalRepetition[0].guid,
                        inflight: true,
                        ts: 0,
                        q: 0,
                    });
                }
            }
            return { ...job, status: holdout.length > 0 ? 'created' : 'cancelled', tus: holdout };
        }
        return job;
    }

    async start(job) {
        logVerbose`InternalLeverageHoldout provider starting job ${job.jobGuid}`;
        job = await super.start(job);
        job.tus = []; // release held tus
        return job;
    }
}
