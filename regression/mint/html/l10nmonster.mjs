export default class CardboardConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ ctx, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ 'en/*.html' ],
            targetLangs: [ 'it' ],
        });
        this.resourceFilter = new filters.HTMLFilter();
        this.decoders = [ normalizers.xmlDecoder, normalizers.xmlEntityDecoder ];
        this.translationProviders = {
            Piggy: {
                translator: new translators.PigLatinizer({ quality: 1 }),
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
