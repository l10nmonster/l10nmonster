export default class ReactConfig {
    sourceLang = 'en';
    minimumQuality = 50;
    qualifiedPenalty = 1;
    unqualifiedPenalty = 9;

    constructor({ ctx, stores, adapters, filters, normalizers, translators }) {
        this.translationProvider = new translators.TranslationOS({
            baseURL: 'https://api-sandbox.translated.com/v2',
            apiKey: ctx.env.translated_api_key_sandbox,
            serviceType: 'premium',
            quality: 90,
            trafficStore: new stores.FSTrafficStore(),
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
