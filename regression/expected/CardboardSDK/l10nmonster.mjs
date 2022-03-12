export default class CardboardConfig {
    sourceLang = 'en';
    minimumQuality = 2;
    qualifiedPenalty = 1;
    unqualifiedPenalty = 9;

    constructor({ stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/en.lproj/*.strings' ],
            targetLangs: [ 'ar' ],
        });
        this.resourceFilter = new filters.IosStringsFilter();
        this.decoders = [ normalizers.iosPHDecoder, normalizers.iosEscapesDecoder ];
        this.textEncoders = [ normalizers.xmlEntityEncoder, normalizers.iosEscapesEncoder ];
        this.translationProvider = new translators.Visicode({
            quality: 2
        });
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        });
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
    }
}
