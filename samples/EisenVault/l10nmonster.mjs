export default class EisenVaultConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ adapters, stores, filters, normalizers }) {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it', 'ja', 'pt-BR' ],
        });
        this.snapStore = new stores.FsSnapStore();
        this.resourceFilter = new filters.JavaPropertiesFilter();
        this.decoders = [ normalizers.bracePHDecoder, normalizers.xmlDecoder, normalizers.javaEscapesDecoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });
    }
}
