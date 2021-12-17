import PigLatin from 'pig-latinizer';
const pigLatin = new PigLatin.default();

export class PigLatinizer {
    constructor({ quality }) {
        if (quality ?? true) {
            this.quality = quality;
        } else {
            throw 'You must specify a quality for PigLatinizer';
        }
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = jobRequest.tus.map(tu => ({
            guid: tu.guid,
            tgt: `[${pigLatin.translate(tu.src)}-${jobRequest.targetLang}]`,
            q: this.quality
        }));
        jobResponse.status = 'done';
        return jobResponse;
    }

    async fetchTranslations(jobManifest) {
        return null;
    }
}
