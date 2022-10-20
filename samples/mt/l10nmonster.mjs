export default class MTConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ ctx, adapters, filters, normalizers, translators }) {
        const [ kwTranslatorDecoder, kwTranslatorEncoder ] = normalizers.keywordTranslatorMaker(
            'kw', 
            { 
                'Payments Testing': { 
                    'it': '**Payment Testing**'
                },
                'testing scenarios': {}
            });

        this.contentTypes = {
            local: {
                source: new adapters.FsSource({
                    globs: [ 'en/*.json' ],
                    targetLangs: [ 'it' ]
                }),
                resourceFilter: new filters.JsonFilter(),
                decoders: [ kwTranslatorDecoder ],
                textEncoders: [ kwTranslatorEncoder ],
                codeEncoders: [ kwTranslatorEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            }
        };
        this.translationProviders = {
            Piggy: {
                translator: new translators.PigLatinizer({ quality: 1 }),
                pairs: { en: [ 'it' ]},
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
    }
} 

export const opsDir = 'l10nOps';
