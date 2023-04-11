export default class ReactConfig {
    sourceLang = 'en';
    minimumQuality = 50;
    seqMap = 'seqMap.json';
    seqThreshold = 100;

    constructor({ stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en/*.json' ],
            targetLangs: [ 'de', 'ru' ],
        });
        this.resourceFilter = new filters.JsonFilter();
        this.decoders = [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ];
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
                resourceFilter: new filters.JsonFilter({
                    enableArbAnnotations : true,
                    enablePluralSuffixes : true,
                    emitArbAnnotations : true,
                }),
                decoders: [ normalizers.xmlDecoder, normalizers.xmlEntityDecoder, normalizers.i18nextPHDecoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            },
        }
    }
}
