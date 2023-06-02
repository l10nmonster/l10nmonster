const { setCtx } = require('@l10nmonster/helpers');

module.exports = class EisenVaultConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ helpers, adapters, translators }) {
        setCtx(helpers.sharedCtx());
        const java = require('./node_modules/@l10nmonster/helpers-java');
        const demo = require('./node_modules/@l10nmonster/helpers-demo');
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it' ],
        });
        this.resourceFilter = new java.PropertiesFilter();
        this.segmentDecorator = segments => segments.map(seg => {
            if (seg.sid.indexOf('org.alfresco.blog.post-') === 0) {
                return { ...seg, notes: 'PH({0}|Hello World|Item title / page link)' };
            }
            return seg;
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
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
    }
}
