export default class CardboardConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ stores, adapters, filters, normalizers }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
            targetLangs: [ 'ar', 'it', 'ja' ],
        });
        this.snapStore = new stores.FsSnapStore({
            snapDir: 'snap',
        });
        this.resourceFilter = new filters.IosStringsFilter();
        this.decoders = [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: '../CardboardSDK-t9n/translationJobs',
        });
    }
}
