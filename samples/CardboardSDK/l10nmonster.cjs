const { normalizers, xml, stores, adapters, translators, analyzers } = require('@l10nmonster/helpers');
const ios = require('@l10nmonster/helpers-ios');
// const translated = require('@l10nmonster/helpers-translated');

module.exports = class CardboardConfig2 {
    sourceLang = 'en';
    targetLangs = {
        LTR: [ 'en-GB', 'en-AU', 'it', 'ja' ],
        RTL: [ 'ar' ],
    };
    minimumQuality = 50;

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
        });
        this.snapStore = new stores.FsSnapStore({
            snapDir: 'snap',
        });
        this.resourceFilter = new ios.StringsFilter();
        this.decoders = [ ios.phDecoder, ios.escapesDecoder, xml.entityDecoder ],
        this.textEncoders = [ normalizers.gatedEncoder(xml.entityEncoder, 'xmlEntityDecoder') ],
        this.tuFilters = {
            initial: tu => tu.sid.indexOf(l10nmonster.arg) === 0,
        };
        // const defaultTOSConfig = {
        //     baseURL: 'https://api-sandbox.translated.com/v2',
        //     apiKey: l10nmonster.env.translated_api_key_sandbox,
        //     serviceType: 'premium',
        //     quality: 90,
        // };
        this.translationProviders = {
            BritishTranslator: {
                translator: new translators.VariantGenerator({
                    dict: require('./dict.json'),
                    quality: 70,
                }),
                pairs: { 'en': [ 'en-GB' ] },
            },
            AussieTranslator: {
                translator: new translators.VariantGenerator({
                    dict: {
                        customise: 'tinkerise',
                    },
                    baseLang: 'en-GB',
                    quality: 70,
                }),
                pairs: { 'en': [ 'en-AU' ] },
            },
            // TranslationOS: {
            //     translator: new translated.TranslationOS(defaultTOSConfig),
            //     pairs: { 'en': [ 'ar', 'it', 'ja' ] },
            // },
            // TOSLQA: { // fake sample of a "push and forget" configuration
            //     translator: new translated.TranslationOS({ ...defaultTOSConfig, serviceType: 'bugfix', requestOnly: true }),
            // },
            // ModernMT: {
            //     translator: new translated.ModernMT({
            //         apiKey: l10nmonster.env.mmt_api_key,
            //         quality: 40,
            //         maxCharLength: 1000,
            //     }),
            // },
            // DeepL: {
            //     translator: new translators.DeepL({
            //         apiKey: l10nmonster.env.deepl_api_key,
            //         quality: 40,
            //     }),
            //     quota: 0,
            // },
            // GCT: {
            //     translator: new translators.GoogleCloudTranslateV3({
            //         keyFilename: l10nmonster.env.gct_credentials,
            //         projectId: l10nmonster.env.gct_project,
            //         quality: 40,
            //     }),
            // },
            Visicode: {
                translator: new translators.Visicode({
                    quality: 50,
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
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        this.analyzers = analyzers;
    }

    static l10nops = 'l10nOps';
    static extensionCmds = [
        class mystats {
            static help = {
                description: 'just a demo of how to create your own commands',
                options: [
                    [ '-l, --lang <language>', 'restrict to language' ]
                ],
            };
            static async action(mm, options) {
                const targetLangs = mm.getTargetLangs(options.lang);
                for (const targetLang of targetLangs) {
                    const stats = {};
                    const allJobs = await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang);
                    allJobs.forEach(entry => stats[entry[1].status] = (stats[entry[1].status] ?? 0) + 1);
                    console.log(`Target language ${targetLang}: ${stats.done ?? 0} done ${stats.pending ?? 0} pending ${stats.req ?? 0} req`);
                }
            }
        }
    ];
};
