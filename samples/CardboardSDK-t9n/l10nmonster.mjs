export default class CardboardConfigTranslationOnly {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ ctx, stores, adapters, filters, translators }) {
        this.source = new adapters.SnapSource({
            baseDir: '../CardboardSDK/snap',
            targetLangs: [ 'ar', 'it', 'ja' ],
        });
        this.resourceFilter = new filters.SnapFilter();
        const defaultTOSConfig = {
            baseURL: 'https://api-sandbox.translated.com/v2',
            apiKey: ctx.env.translated_api_key_sandbox,
            serviceType: 'premium',
            quality: 90,
        };
        this.translationProviders = {
            TranslationOS: {
                translator: new translators.TranslationOS(defaultTOSConfig),
                pairs: { 'en': [ 'ar', 'it', 'ja' ] },
            },
            TOSLQA: { // fake sample of a "push and forget" configuration
                translator: new translators.TranslationOS({ ...defaultTOSConfig, serviceType: 'bugfix', requestOnly: true }),
            },
            ModernMT: {
                translator: new translators.ModernMT({
                    apiKey: ctx.env.mmt_api_key,
                    quality: 40,
                    maxCharLength: 1000,
                }),
            },
            DeepL: {
                translator: new translators.DeepL({
                    apiKey: ctx.env.deepl_api_key,
                    quality: 40,
                }),
                quota: 0,
            },
            GCT: {
                translator: new translators.GoogleCloudTranslateV3({
                    keyFilename: ctx.env.gct_credentials,
                    projectId: ctx.env.gct_project,
                    quality: 40,
                }),
            },
            Repetition: {
                translator: new translators.Repetition({
                    qualifiedPenalty: 1,
                    unqualifiedPenalty: 9,
                }),
            },
        };
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('../CardboardSDK/snap/en.lproj', `translatedSnaps/${lang}`),
        });
        this.tuFilters = {
            initial: tu => tu.sid.indexOf(ctx.arg) === 0,
        };
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
}

export const opsDir = 'l10nOps';
