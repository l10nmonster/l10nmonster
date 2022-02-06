const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class TachiyomiConfig {
    sourceLang = 'en';

    constructor({ ctx, stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
            targetLangs: [ 'ja', 'it' ],
        });
        this.resourceFilter = new filters.AndroidFilter({
            comment: 'pre',
        });
        this.decoders = [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });

        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
            logRequests: true,
        });
        this.stateStore = new stores.JsonStateStore({
            org: 'test1',
            prj: 'tachiyomi',
            stateFileName: 'state.json',
        });
        // this.stateStore = new stores.SqlStateStore({
        //     org: 'test1',
        //     prj: 'tachiyomi',
        //     client: 'mysql2',
        //     host: ctx.env.l10nmonster_host,
        //     port: ctx.env.l10nmonster_port,
        //     user: ctx.env.l10nmonster_user,
        //     password: ctx.env.l10nmonster_password,
        //     database: ctx.env.l10nmonster_database,
        //     cert: '/etc/ssl/cert.pem',
        // });
        // const xliffTranslator = new translators.XliffBridge({
        //     requestPath: (lang, prjId) => `xliff/outbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
        //     completePath: (lang, prjId) => `xliff/inbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
        //     quality: 80,
        // });
        // const piggyTranslator = new translators.PigLatinizer({ quality: 1 });
        // this.translationProvider = (job) => (job.targetLang === 'piggy' ? piggyTranslator : xliffTranslator);
        // this.minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);
        this.translationProvider = new translators.TranslationOS({
            baseURL: 'https://api-sandbox.translated.com/v2',
            apiKey: ctx.env.translated_api_key_sandbox,
            serviceType: 'premium',
            quality: 90,
        });
        this.minimumQuality = 50;
    }
}
