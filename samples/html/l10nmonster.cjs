const { adapters, translators } = require('@l10nmonster/helpers');
const http = require('@l10nmonster/helpers-http');
const html = require('@l10nmonster/helpers-html');
const demo = require('@l10nmonster/helpers-demo');
const translated = require('@l10nmonster/helpers-translated');

module.exports = class HtmlConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'en', 'it' ];
    minimumQuality = 50;

    constructor() {
        this.contentTypes = {
            local: {
                source: new adapters.FsSource({
                    globs: [ 'en/*.html' ],
                    targetLangs: [ 'it' ], // override default
                    prj: 'local',
                }),
                resourceFilter: new html.Filter(),
                decoders: [ helpers.xml.tagDecoder, helpers.xml.entityDecoder ],
                textEncoders: [ helpers.xml.entityEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            },
            remote: {
                source: new http.Source({
                    urlMap: {
                        'google': 'https://www.google.com/',
                    },
                    prj: 'remote',
                }),
                resourceFilter: new html.Filter(),
                decoders: [ helpers.xml.tagDecoder, helpers.xml.entityDecoder ],
                textEncoders: [ helpers.xml.entityEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => `remote/${lang}/${resourceId}.html`,
                }),
            },
        };
        this.translationProviders = {
            Piggy: {
                translator: new demo.PigLatinizer({ quality: 1 }),
                pairs: { en: [ 'it' ]},
            },
            ModernMT: {
                translator: new translated.ModernMT({
                    apiKey: l10nmonster.env.mmt_api_key,
                    quality: 40,
                    maxCharLength: 1000,
                }),
            },
            // DeepL: {
            //     translator: new translators.DeepL({
            //         apiKey: l10nmonster.env.deepl_api_key,
            //         quality: 40,
            //     }),
            //     quota: 0,
            // },
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
