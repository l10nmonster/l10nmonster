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
        jobResponse.tus = jobRequest.tus.map(tu => {
            const translation = { guid: tu.guid };
            if (tu.nsrc) {
                translation.ntgt = [
                    '[',
                    ...tu.nsrc.map(n => (typeof n === 'string' ? pigLatin.translate(n) : n)),
                    `-${jobRequest.targetLang}]`
                ];
                translation.contentType = tu.contentType;
            } else {
                translation.tgt = `[${pigLatin.translate(tu.src)}-${jobRequest.targetLang}]`;
            }
            translation.q = this.quality;
            return translation;
        });
        jobResponse.status = 'done';
        jobResponse.ts = this.ctx.regression ? 1 : new Date().getTime();
        return jobResponse;
    }

    async fetchTranslations() {
        throw 'PigLatinizer is a synchronous-only provider';
    }
}
