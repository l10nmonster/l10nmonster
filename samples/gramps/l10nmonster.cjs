const { setCtx } = require('@l10nmonster/helpers');

module.exports = class GrampsConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ helpers, adapters }) {
        setCtx(helpers.sharedCtx());
        const po = require('@l10nmonster/helpers-po');
        const demo = require('@l10nmonster/helpers-demo');
        this.source = new adapters.FsSource({
            // TODO: we could have a decorating function that given the resource id provides the custom target lang (e.g. based on a naming convention). Potentially even at the TU level
            globs: [
                'artifacts/*.pot',
            ],
            targetLangs: [ 'ja', 'it' ],
        });
        // TODO: add hooks to allow to manipulate content before/after processing (see https://serge.io/docs/modular-architecture/)
        this.resourceFilter = new po.Filter({
            // TODO: add configuration for baseline message format (e.g. HTML on top of the "flag" format)
        });
        this.translationProvider = new demo.PigLatinizer({
            quality: 2
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang) => `artifacts/${lang}.po`,
        });
    }
}
