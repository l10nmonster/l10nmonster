import PigLatin from 'pig-latinizer';
const pigLatin = new PigLatin.default();

export class PigLatinizer {
    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = jobRequest.tus.map(tu => ({
            guid: tu.guid,
            str: `[${pigLatin.translate(tu.str)}-${jobRequest.targetLang}]`,
            q: '001-pseudo', // pig latin's quality is very low! ;)
        }));
        jobResponse.status = 'done';
        return jobResponse;
    }

    async fetchTranslations(jobManifest) {
        return null;
    }
}
