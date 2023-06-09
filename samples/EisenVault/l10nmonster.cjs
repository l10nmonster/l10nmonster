const java = require('@l10nmonster/helpers-java');
const { xml, stores, adapters, normalizers } = require('@l10nmonster/helpers');

module.exports = class EisenVaultConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it', 'ja', 'pt-BR' ],
            resDecorator: resMeta => ({ ...resMeta, prj: resMeta.id.split('/')[1].split('.')[0].split('-')[0]}),
        });
        this.snapStore = new stores.FsSnapStore();
        this.resourceFilter = new java.PropertiesFilter();
        this.decoders = [ normalizers.bracePHDecoder, xml.tagDecoder, java.escapesDecoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'l10njobs',
        });
    }
}
