const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class TachiyomiConfig {
    sourceLang = 'en';
    targetLangs = [ 'ja', 'it', 'piggy' ];
    unqualifiedRepetitionsQuality = 70; // ignore filename and string id

    constructor({ ctx, stores, adapters, filters, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
        });
        this.resourceFilter = new filters.AndroidFilter({
            comment: 'pre',
        });
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
        const xliffTranslator = new translators.XliffBridge({
            requestPath: (lang, prjId) => `xliff/outbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
            completePath: (lang, prjId) => `xliff/inbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
            quality: 80,
        });
        const piggyTranslator = new translators.PigLatinizer();
        this.translationProvider = (job) => job.targetLang === 'piggy' ? piggyTranslator : xliffTranslator;
    }
}
