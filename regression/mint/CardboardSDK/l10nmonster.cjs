const ios = require('@l10nmonster/helpers-ios');
const { xml, stores, adapters, translators } = require('@l10nmonster/helpers');

module.exports = class CardboardConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;
    seqMap = 'seqMap.json';

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
            targetLangs: [ 'ar' ],
        });
        this.resourceFilter = new ios.StringsFilter();
        this.decoders = [ ios.phDecoder, ios.escapesDecoder ];
        this.textEncoders = [ xml.entityEncoder, ios.escapesEncoder ];
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
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`)
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
};