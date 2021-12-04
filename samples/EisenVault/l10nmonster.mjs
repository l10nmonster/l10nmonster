export default class TachiyomiConfig {
    sourceLang = 'en';
    targetLangs = [ 'it', 'ja', 'pt-BR' ];

    constructor({ ctx, stores, adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
        });
        this.resourceFilter = new filters.JavaPropertiesFilter();
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });        
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
}
