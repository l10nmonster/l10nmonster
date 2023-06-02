const { setCtx } = require('@l10nmonster/helpers');

module.exports = class ReactConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;
    seqMap = 'seqMap.json';
    seqThreshold = 100;

    constructor({ helpers,  stores, adapters, translators }) {
        setCtx(helpers.sharedCtx());
        const { i18next } = require('./node_modules/@l10nmonster/helpers-json');
        this.source = new adapters.FsSource({
            globs: [ '**/en/*.json' ],
            targetLangs: [ 'de', 'ru' ],
        });
        this.translationProviders = {
            Visicode: {
                translator: new translators.Visicode({
                    quality: 2
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
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        this.contentTypes = {
            node: {
                source: new adapters.FsSource({
                    targetLangs: [ 'de', 'ru' ],
                    globs: [ '**/en/*.json' ],
                }),
                resourceFilter: new i18next.Filter({
                    enableArbAnnotations : true,
                    enablePluralSuffixes : true,
                    emitArbAnnotations : true,
                }),
                decoders: [ helpers.xml.tagDecoder, helpers.xml.entityDecoder, i18next.phDecoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            },
        }
    }
}
