const java = require('@l10nmonster/helpers-java');
const { xml, stores, adapters, normalizers } = require('@l10nmonster/helpers');
const lint = require('./lint.cjs');

module.exports = class EisenVaultConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'it', 'ja', 'pt-BR' ];
    minimumQuality = 50;
    source = new adapters.FsSource({
        globs: [ '**/*_en.properties' ],
        resDecorator: resMeta => ({ ...resMeta, prj: resMeta.id.split('/')[1].split('.')[0].split('-')[0]}),
    });
    snapStore = new stores.FsSnapStore();
    resourceFilter = new java.PropertiesFilter();
    decoders = [ normalizers.bracePHDecoder, xml.tagDecoder, java.escapesDecoder ];
    target = new adapters.FsTarget({
        targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
    });
    jobStore = new stores.JsonJobStore({
        jobsDir: 'l10njobs',
    });
    static extensionCmds = [ lint ];
}
