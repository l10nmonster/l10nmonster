export default class CardboardConfig {
    sourceLang = 'en';
    minimumQuality = 50;
    qualifiedPenalty = 1;
    unqualifiedPenalty = 9;

    constructor({ ctx, stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
            targetLangs: [ 'ar', 'it', 'ja' ],
        });
        this.resourceFilter = new filters.IosStringsFilter();
        this.decoders = [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ];
        const defaultTOSConfig = {
            baseURL: 'https://api-sandbox.translated.com/v2',
            apiKey: ctx.env.translated_api_key_sandbox,
            serviceType: 'premium',
            quality: 90,
            trafficStore: new stores.FSTrafficStore(),
        };
        this.translationProviders = {
            TranslationOS: {
                translator: new translators.TranslationOS(defaultTOSConfig),
                pairs: { 'en': [ 'ar', 'it', 'ja' ] },
            },
            TOSRefresh: {
                translator: new translators.TOSRefresh(defaultTOSConfig),
            },
            TOSBugfix: {
                translator: new translators.TranslationOS({ ...defaultTOSConfig, requestOnly: true }),
                pairs: { 'en': [ 'ar', 'it', 'ja' ] },
            },
        };
        this.bugfixFilters = {
            initial: tu => tu.sid.indexOf(ctx.arg) === 0,
        };
        // this.translationProvider = new translators.ModernMT({
        //     apiKey: ctx.env.mmt_api_key,
        //     quality: 40,
        //     maxCharLength: 100,
        // });
        // this.translationProvider = new translators.DeepL({
        //     apiKey: ctx.env.deepl_api_key,
        //     quality: 40,
        // });
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
}

export const opsDir = 'l10nOps';
