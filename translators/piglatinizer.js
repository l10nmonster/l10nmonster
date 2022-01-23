import PigLatin from 'pig-latinizer';
const pigLatin = new PigLatin.default();

export class PigLatinizer {
    constructor({ quality } = {}) {
        if (quality === undefined) {
            throw 'You must specify a quality for PigLatinizer';
        } else {
            this.quality = quality;
        }
    }

    async requestTranslations(jobRequest) {
        // eslint-disable-next-line no-unused-vars
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = jobRequest.tus.map(tu => ({
            guid: tu.guid,
            tgt: `[${pigLatin.translate(tu.src)}-${jobRequest.targetLang}]`,
            q: this.quality
        }));
        jobResponse.status = 'done';
        jobResponse.ts = 1;
        return jobResponse;
    }

    async fetchTranslations() {
        return null;
    }
}
