export default class EisenVaultConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it' ],
        });
        this.resourceFilter = new filters.JavaPropertiesFilter();
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
    }
}
