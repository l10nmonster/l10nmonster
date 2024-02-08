const { xml, stores, adapters, translators } = require('@l10nmonster/helpers');
const android = require('@l10nmonster/helpers-android');
const xliff = require('@l10nmonster/helpers-xliff');
const demo = require('@l10nmonster/helpers-demo');

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

module.exports = class TachiyomiConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'zh-Hans', 'zh-Hant', 'piggy' ];

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
        });
        this.resourceFilter = new android.Filter({
            comment: 'pre',
        });
        this.decoders = [ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, android.phDecoder ];
        this.textEncoders = [ android.escapesEncoder, xml.entityEncoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        this.translationProviders = {
            PigLatinizer: {
                translator: new demo.PigLatinizer({ quality: 1 }),
                pairs: { en: [ 'piggy' ]},
            },
            XliffBridge: {
                translator: new xliff.BridgeTranslator({
                    requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
                    completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
                    quality: 80,
                }),
            },
            Repetition: {
                translator: new translators.Repetition({
                    qualifiedPenalty: 1,
                    unqualifiedPenalty: 9,
                }),
            },
            Grandfather: {
                translator: new translators.Grandfather({
                    quality: 70,
                }),
            },
        };
        this.minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);
    }
}
