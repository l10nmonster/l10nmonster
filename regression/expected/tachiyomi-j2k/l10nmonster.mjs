const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class TachiyomiConfig {
    sourceLang = 'en';
    qualifiedPenalty = 1;
    unqualifiedPenalty = 9;

    constructor({ stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
            targetLangs: [ 'zh-Hans', 'zh-Hant', 'piggy' ],
        });
        this.resourceFilter = new filters.AndroidFilter({
            comment: 'pre',
        });
        this.decoders = [ normalizers.xmlEntityDecoder, normalizers.xmlCDataDecoder, normalizers.androidSpaceCollapser, normalizers.androidEscapesDecoder, normalizers.iosPHDecoder ];
        this.encoders = [ normalizers.androidEscapesEncoder, normalizers.xmlEntityEncoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });

        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        this.stateStore = new stores.JsonStateStore({
            org: 'test1',
            prj: 'tachiyomi',
            stateFileName: 'state.json',
        });
        const xliffTranslator = new translators.XliffBridge({
            requestPath: (lang, prjId) => `xliff/outbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
            completePath: (lang, prjId) => `xliff/inbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
            quality: 80,
        });
        const piggyTranslator = new translators.PigLatinizer({ quality: 1 });
        this.translationProvider = (job) => (job.targetLang === 'piggy' ? piggyTranslator : xliffTranslator);
        this.minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);
    }
}
