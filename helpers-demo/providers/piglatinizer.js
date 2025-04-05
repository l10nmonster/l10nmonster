import PigLatin from 'pig-latinizer';
import { L10nContext, providers, logVerbose } from '@l10nmonster/core';

const pigLatin = new PigLatin.default();

export class PigLatinizer extends providers.BaseTranslationProvider {
    /**
     * Initializes a new instance of the PigLatinizer class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} options.quality - The quality to assign translations.
     */
    constructor(options) {
        if (!options.quality) {
            throw new Error('You must specify quality for PigLatinizer');
        }
        super(options);
    }

    async start(job) {
        logVerbose`PigLatinizer provider starting job ${job.jobGuid}`;
        job = await super.start(job);
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        job.tus = job.tus.map(tu => {
            const translation = { guid: tu.guid, ts };
            translation.ntgt = [
                '[',
                ...tu.nsrc.map(n => (typeof n === 'string' ? pigLatin.translate(n) : { ...n })),
                `-${job.targetLang}]`
            ];
            translation.q = this.quality;
            return translation;
        });
        job.status = 'done';
        return job;
    }
}
