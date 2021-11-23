const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class TachiyomiConfig {
    sourceLang = 'en';
    targetLangs = [ 'ja', 'it' ];
    // debug = {
    //     logRequests: true,
    // };

    constructor({ ctx, jobStores, adapters, filters, translators }) {
        const source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
        });
        const resourceFilter = new filters.AndroidFilter({
            comment: 'pre',
        });
        const target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });
        
        this.jobStore = new jobStores.JsonJobStore({
            jobsDir: 'translationJobs',
        });
        // this.jobStore = new jobStores.SqlJobStore({
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
        this.pipelines = {
            default: {
                source,
                resourceFilter,
                translationProvider: new translators.XliffBridge({
                    requestPath: (lang, prjId) => `xliff/outbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
                    completePath: (lang, prjId) => `xliff/inbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
                    quality: '080-human-single-pass',
                }),
                target,
            },
            piggy: {
                source,
                resourceFilter,
                translationProvider: new translators.PigLatinizer(),
                target,
            },
        };
    }
}
