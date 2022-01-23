export default class CardboardConfig {
    sourceLang = 'en';
    targetLangs = [ 'ar' ];
    minimumQuality = 50;

    constructor({ stores, adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
        });
        this.resourceFilter = new filters.IosStringsFilter();
        this.translationProvider = new translators.PigLatinizer({
            quality: 2
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
            logRequests: true,
        });
    }
}
