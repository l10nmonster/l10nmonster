import { default as PigLatin } from 'pig-latinizer';
import { L10nContext, providers, logVerbose } from '@l10nmonster/core';

const pigLatin = new PigLatin.default();

export class PigLatinizer {
    constructor({ quality }) {
        if (quality === undefined) {
            throw 'You must specify a quality for PigLatinizer';
        } else {
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        // eslint-disable-next-line no-unused-vars
        const { tus, ...jobResponse } = jobRequest;
        const ts = L10nContext.regression ? 1 : new Date().getTime();
        jobResponse.tus = jobRequest.tus.map(tu => {
            const translation = { guid: tu.guid, ts };
            translation.ntgt = [
                '[',
                ...tu.nsrc.map(n => (typeof n === 'string' ? pigLatin.translate(n) : { ...n })),
                `-${jobRequest.targetLang}]`
            ];
            translation.q = this.quality;
            return translation;
        });
        jobResponse.status = 'done';
        return jobResponse;
    }

    async fetchTranslations() {
        throw 'PigLatinizer is a synchronous-only provider';
    }
}

export class PigLatinizerProvider extends providers.BaseTranslationProvider {
    /**
     * Initializes a new instance of the Repetition class.
     * @param {Object} options - The parameters for the constructor.
     * @param {string} [options.id] - Global identifier for the provider.
     * @param {Object} [options.supportedPairs] - Supported pairs for the provider.
     * @param {number} options.quality - The quality to assign grandfathered translations.
     */
    constructor(options) {
        if (!options.quality) {
            throw new Error('You must specify quality for Visicode');
        }
        super(options);
    }

    async start(job) {
        logVerbose`PigLatinizer provider starting job ${job.jobGuid}`;
        console.dir(job);
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
