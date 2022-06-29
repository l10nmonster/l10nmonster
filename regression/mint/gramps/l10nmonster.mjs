export default class GrampsConfig {
    sourceLang = 'en';

    constructor({ ctx, adapters, filters, translators }) {
        this.minimumQuality = ctx.build === 'prod' ? 95 : 0; // only push production builds
        this.source = new adapters.FsSource({
            globs: [
                'artifacts/*.pot',
            ],
            targetLangs: [ 'ja' ],
        });
        this.resourceFilter = new filters.PoFilter({
        });
        this.translationProviders = {
            PigLatinizer: {
                translator: new translators.PigLatinizer({
                    quality: 2
                }),
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
            targetPath: (lang) => `artifacts/${lang}.po`,
        });
    }
}
