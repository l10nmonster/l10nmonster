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
        this.textEncoders = [ normalizers.androidEscapesEncoder, normalizers.xmlEntityEncoder ];
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
        this.translationProviders = {
            PigLatinizer: {
                translator: new translators.PigLatinizer({ quality: 1 }),
                pairs: { en: [ 'piggy' ]},
            },
            XliffBridge: {
                translator: new translators.XliffBridge({
                    requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
                    completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
                    quality: 80,
                }),
            },
        };
        this.minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);
    }
}
