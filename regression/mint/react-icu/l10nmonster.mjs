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
        // this.translationProvider = new translators.TranslationOS({
        //     baseURL: 'https://api-sandbox.translated.com/v2',
        //     apiKey: ctx.env.translated_api_key_sandbox,
        //     serviceType: 'premium',
        //     quality: 90,
        // });
        // this.translationProvider = new translators.ModernMT({
        //     apiKey: ctx.env.mmt_api_key,
        //     quality: 40,
        //     maxCharLength: 100,
        // });
        this.translationProvider = new translators.DeepL({
            apiKey: ctx.env.deepl_api_key,
            quality: 40,
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
}

export const opsDir = 'l10nOps';
