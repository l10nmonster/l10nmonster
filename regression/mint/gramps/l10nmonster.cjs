const { adapters, translators, stores } = require('@l10nmonster/helpers');
const po = require('@l10nmonster/helpers-po');
const demo = require('@l10nmonster/helpers-demo');

module.exports = class GrampsConfig2 {
    sourceLang = 'en';

    constructor() {
        this.minimumQuality = l10nmonster.arg === 'prod' ? 95 : 0; // only push production builds
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
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'l10njobs',
        });
    }
}
