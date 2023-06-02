const { setCtx, sharedCtx } = require('@l10nmonster/helpers');

module.exports = class CardboardConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ helpers, stores, adapters, translators }) {
        setCtx(helpers.sharedCtx());
        const ctx = sharedCtx();
        const ios = require('@l10nmonster/helpers-ios');
        const translated = require('@l10nmonster/helpers-translated');
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
            targetLangs: [ 'ar', 'it', 'ja' ],
        });
        this.snapStore = new stores.FsSnapStore({
            snapDir: 'snap',
        });
        this.resourceFilter = new ios.StringsFilter();
        this.decoders = [ ios.phDecoder, ios.escapesDecoder ];
        this.tuFilters = {
            initial: tu => tu.sid.indexOf(ctx.arg) === 0,
        };
        const defaultTOSConfig = {
            baseURL: 'https://api-sandbox.translated.com/v2',
            apiKey: ctx.env.translated_api_key_sandbox,
            serviceType: 'premium',
            quality: 90,
        };
        this.translationProviders = {
            TranslationOS: {
                translator: new translated.TranslationOS(defaultTOSConfig),
                pairs: { 'en': [ 'ar', 'it', 'ja' ] },
            },
            TOSLQA: { // fake sample of a "push and forget" configuration
                translator: new translated.TranslationOS({ ...defaultTOSConfig, serviceType: 'bugfix', requestOnly: true }),
            },
            // ModernMT: {
            //     translator: new translated.ModernMT({
            //         apiKey: ctx.env.mmt_api_key,
            //         quality: 40,
            //         maxCharLength: 1000,
            //     }),
            // },
            // DeepL: {
            //     translator: new translators.DeepL({
            //         apiKey: ctx.env.deepl_api_key,
            //         quality: 40,
            //     }),
            //     quota: 0,
            // },
            // GCT: {
            //     translator: new translators.GoogleCloudTranslateV3({
            //         keyFilename: ctx.env.gct_credentials,
            //         projectId: ctx.env.gct_project,
            //         quality: 40,
            //     }),
            // },
            Repetition: {
                translator: new translators.Repetition({
                    qualifiedPenalty: 1,
                    unqualifiedPenalty: 9,
                }),
            },
        };
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
};
module.exports.l10nops = 'l10nOps';
