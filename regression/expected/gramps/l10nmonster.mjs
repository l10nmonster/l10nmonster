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
        this.translationProvider = new translators.PigLatinizer({
            quality: 2
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang) => `artifacts/${lang}.po`,
        });
    }
}
