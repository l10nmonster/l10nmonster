export default class EisenVaultConfig {
    sourceLang = 'en';
    targetLangs = [ 'it', 'ja', 'pt-BR' ];

    constructor({ adapters, filters }) {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
        });
        this.resourceFilter = new filters.JavaPropertiesFilter();
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });        
    }
}
