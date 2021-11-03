import PigLatin from 'pig-latinizer';
const pigLatin = new PigLatin.default();

export class PigLatinizer {
    async requestTranslations(job) {
        job.tus = job.tus.map(tu => ({
            guid: tu.guid,
            str: `[${pigLatin.translate(tu.str)}-${job.targetLang}]`,
            q: '001-pseudo', // pig latin's quality is very low! ;)
        }));
        job.status = 'done';
        return job;
    }

    async fetchTranslations(jobManifest) {
        return null;
    }
}
