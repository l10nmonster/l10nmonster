export default class GrampsConfig {
    sourceLang = 'en';
    constructor({ ctx, adapters, filters, translators }) {
        this.minimumQuality = ctx.build === 'prod' ? 95 : 0; // only push production builds
        this.source = new adapters.FsSource({
            // TODO: we could have a decorating function that given the resource id provides the custom target lang (e.g. based on a naming convention). Potentially even at the TU level
            globs: [
                'artifacts/*.pot',
            ],
            targetLangs: [ 'ja', 'it' ],
        });
        // TODO: add hooks to allow to manipulate content before/after processing (see https://serge.io/docs/modular-architecture/)
        this.resourceFilter = new filters.PoFilter({
            // TODO: add configuration for baseline message format (e.g. HTML on top of the "flag" format)
        });
        this.translationProvider = new translators.PigLatinizer({
            quality: 2
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang) => `artifacts/${lang}.po`,
        });
    }
}
