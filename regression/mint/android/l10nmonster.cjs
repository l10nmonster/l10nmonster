const { xml, stores, adapters, translators, normalizers } = require('@l10nmonster/helpers');
const android = require('@l10nmonster/helpers-android');
const xliff = require('@l10nmonster/helpers-xliff');
const demo = require('@l10nmonster/helpers-demo');

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
};

module.exports = class TachiyomiConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'zh-Hans' ];

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
        });
        this.resourceFilter = new android.Filter({
            comment: 'pre',
        });
        this.decoders = [ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, xml.tagDecoder, android.phDecoder ];
        this.textEncoders = [ android.escapesEncoder, xml.entityEncoder ];
        this.codeEncoders = [ normalizers.gatedEncoder(xml.entityEncoder, 'xmlCDataDecoder') ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        this.translationProviders = {
            Grandfather: {
                translator: new translators.Grandfather({
                    quality: 70,
                }),
            },
        };
        this.minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);
    }
}
