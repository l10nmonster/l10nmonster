export default class EisenVaultConfig {
    sourceLang = 'en';

    constructor({ adapters, filters, normalizers }) {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it', 'ja', 'pt-BR' ],
        });
        this.resourceFilter = new filters.JavaPropertiesFilter();
        this.decoders = [ normalizers.bracePHDecoder, normalizers.xmlDecoder, normalizers.javaEscapesDecoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });
    }
}
