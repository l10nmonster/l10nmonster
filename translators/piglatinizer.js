import PigLatin from 'pig-latinizer';
const pigLatin = new PigLatin.default();

export class PigLatinizer {
    constructor({ quality } = {}) {
        this.quality = quality || 1;
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = jobRequest.tus.map(tu => ({
            guid: tu.guid,
            str: `[${pigLatin.translate(tu.str)}-${jobRequest.targetLang}]`,
            q: this.quality
        }));
        jobResponse.status = 'done';
        return jobResponse;
    }

    async fetchTranslations(jobManifest) {
        return null;
    }
}
