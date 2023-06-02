const { setCtx } = require('@l10nmonster/helpers');

module.exports = class CardboardConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ helpers,  adapters, translators }) {
        setCtx(helpers.sharedCtx());
        const html = require('./node_modules/@l10nmonster/helpers-html');
        const demo = require('./node_modules/@l10nmonster/helpers-demo');
        this.source = new adapters.FsSource({
            globs: [ 'en/*.html' ],
            targetLangs: [ 'it' ],
        });
        this.resourceFilter = new html.Filter();
        this.decoders = [ helpers.xml.tagDecoder, helpers.xml.entityDecoder ];
        this.translationProviders = {
            Piggy: {
                translator: new demo.PigLatinizer({ quality: 1 }),
                pairs: { en: [ 'it' ]},
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
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        });
    }
}
