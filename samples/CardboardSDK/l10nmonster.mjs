export default class CardboardConfig {
    sourceLang = 'en';
    targetLangs = [ 'ar', 'it', 'ja' ];

    constructor({ ctx, stores, adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
        });
        this.resourceFilter = new filters.IosStringsFilter();
        this.translationProvider = new translators.PigLatinizer();
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });        
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
            logRequests: true,
        });
    }
}
