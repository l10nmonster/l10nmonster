export default class HtmlConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ ctx, adapters, filters, normalizers, translators }) {
        this.contentTypes = {
            local: {
                source: new adapters.FsSource({
                    globs: [ 'en/*.html' ],
                    targetLangs: [ 'it' ],
                    prj: 'local',
                }),
                resourceFilter: new filters.HTMLFilter(),
                decoders: [ normalizers.xmlDecoder, normalizers.xmlEntityDecoder ],
                textEncoders: [ normalizers.xmlEntityEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            },
            remote: {
                source: new adapters.HttpSource({
                    urlMap: {
                        'google': 'https://www.google.com/',
                    },
                    targetLangs: [ 'en', 'it' ],
                    prj: 'remote',
                }),
                resourceFilter: new filters.HTMLFilter(),
                decoders: [ normalizers.xmlDecoder, normalizers.xmlEntityDecoder ],
                textEncoders: [ normalizers.xmlEntityEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => `remote/${lang}/${resourceId}.html`,
                }),
            },
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
