import { default as PigLatin } from 'pig-latinizer';
import { getRegressionMode } from '@l10nmonster/core';

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
        const ts = getRegressionMode() ? 1 : new Date().getTime();
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
