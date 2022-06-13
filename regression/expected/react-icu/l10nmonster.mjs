export default class ReactConfig {
    sourceLang = 'en';
    minimumQuality = 50;
    qualifiedPenalty = 1;
    unqualifiedPenalty = 9;

    constructor({ ctx, stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en/*.json' ],
            targetLangs: [ 'de', 'ru' ],
        });
        this.resourceFilter = new filters.JsonFilter();
        this.decoders = [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ];
        this.translationProvider = new translators.Visicode({
            quality: 2
        });
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
                decoders: [ normalizers.xmlDecoder, normalizers.doubleBracePHDecoder,
                    normalizers.xmlEntityDecoder, normalizers.i18nextKeyDecoder ],                
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            },            
        }
    }
}

export const opsDir = 'l10nOps';
