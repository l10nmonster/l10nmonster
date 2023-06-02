const { setCtx } = require('@l10nmonster/helpers');

module.exports = class GrampsConfig2 {
    sourceLang = 'en';

    constructor({ helpers, adapters, translators }) {
        setCtx(helpers.sharedCtx());
        const po = require('./node_modules/@l10nmonster/helpers-po');
        const demo = require('./node_modules/@l10nmonster/helpers-demo');
        this.minimumQuality = helpers.sharedCtx().build === 'prod' ? 95 : 0; // only push production builds
        this.source = new adapters.FsSource({
            globs: [
                'artifacts/*.pot',
            ],
            targetLangs: [ 'ja' ],
        });
        this.resourceFilter = new po.Filter({
        });
        this.translationProviders = {
            PigLatinizer: {
                translator: new demo.PigLatinizer({
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
