import { utils } from '../index.js';
import { BaseTranslationProvider } from './baseTranslationProvider.js';

/**
 * @deprecated Use Repetition provider with holdInternalLeverage: true instead.
 * This provider prevents sending identical sources for translation and holds them back for internal leverage later.
 */
export class InternalLeverageHoldout extends BaseTranslationProvider {

    /**
     * Initializes a new instance of the InternalLeverageHoldout class.
     * @param {Object} [options] - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @deprecated Use Repetition provider with holdInternalLeverage: true instead.
     */
    constructor(options = {}) {
        // @ts-ignore
        if (options.quality) {
            throw new Error('Fixed quality is not supported for InternalLeverageHoldout');
        }
        super(options);
        console.warn('InternalLeverageHoldout is deprecated. Use Repetition with holdInternalLeverage: true and expectedQuality option instead.');
    }

    async getAcceptedTus(job) {
        const gstrMap = {};
        const holdout = [];
        for (const tu of job.tus) {
            const gstr = utils.flattenNormalizedSourceToOrdinal(tu.nsrc);
            gstrMap[gstr] ??= [];
            gstrMap[gstr].push(tu);
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
        return holdout;
    }

    async getTranslatedTus() {
        return []; // release held tus
    }
}
