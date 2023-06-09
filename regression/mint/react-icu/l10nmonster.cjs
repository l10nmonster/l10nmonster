const { i18next } = require('@l10nmonster/helpers-json');
const { xml,  stores, adapters, translators, decorators } = require('@l10nmonster/helpers');

module.exports = class ReactConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor() {
        this.translationProviders = {
            Visicode: {
                translator: new translators.Visicode({
                    quality: 2,
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
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        this.sg = new decorators.SequenceGenerator('seqMap.json', 100);
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
                segmentDecorators: [ this.sg.getDecorator() ],
                decoders: [ xml.tagDecoder, xml.entityDecoder, i18next.phDecoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            },
        }
    }

    async init(mm) {
        return this.sg.init(mm);
    }
}
