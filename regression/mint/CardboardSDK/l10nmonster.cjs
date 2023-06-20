const ios = require('@l10nmonster/helpers-ios');
const { xml, stores, adapters, translators, decorators } = require('@l10nmonster/helpers');

module.exports = class CardboardConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'ar' ];
    minimumQuality = 50;

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
        });
        this.resourceFilter = new ios.StringsFilter();
        this.sg = new decorators.SequenceGenerator('seqMap.json');
        this.segmentDecorators = [ this.sg.getDecorator() ];
        this.decoders = [ ios.phDecoder, ios.escapesDecoder ];
        this.textEncoders = [ xml.entityEncoder, ios.escapesEncoder ];
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
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`)
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }

    async init(mm) {
        return this.sg.init(mm);
    }
};
