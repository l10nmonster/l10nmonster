export default class CardboardConfig {
    sourceLang = 'en';
    targetLangs = [ 'ar', 'it', 'ja' ];
    minimumQuality = 50;

    constructor({ ctx, stores, adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
        });
        this.resourceFilter = new filters.IosStringsFilter();
        this.translationProvider = new translators.PigLatinizer({ quality: 1 });
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });        
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
            logRequests: true,
        });
    }
}
