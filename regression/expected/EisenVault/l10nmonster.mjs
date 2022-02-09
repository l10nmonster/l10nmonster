export default class EisenVaultConfig {
    sourceLang = 'en';
    minimumQuality = 50;
    qualifiedPenalty = 1;
    unqualifiedPenalty = 9;

    constructor({ adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it' ],
        });
        this.resourceFilter = new filters.JavaPropertiesFilter();
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });
        this.translationProvider = new translators.PigLatinizer({
            quality: 2
        });
    }
}
