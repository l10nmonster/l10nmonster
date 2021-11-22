// import { JsonJobStore } from '../../src/jsonJobStore.js';
import { SqlJobStore } from '../../src/sqlJobStore.js';
import { FsSource, FsTarget } from '../../adapters/fs.js';
import { AndroidFilter } from '../../filters/android.js';
import { XliffBridge } from '../../translators/xliff.js';
import { PigLatinizer } from '../../translators/piglatinizer.js';

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

    constructor(ctx) {
        const source = new FsSource({
            ctx,
            globs: [ '**/values/strings.xml' ],
        });
        const resourceFilter = new AndroidFilter({
            comment: 'pre',
        });
        const target = new FsTarget({
            ctx,
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });
        
        // this.jobStore = new JsonJobStore({
        //     ctx,
        //     jobsDir: 'translationJobs',
        // });
        this.jobStore = new SqlJobStore({
            org: 'test1',
            prj: 'tachiyomi',
            client: 'mysql2',
            host: ctx.env.l10nmonster_host,
            port: ctx.env.l10nmonster_port,
            user: ctx.env.l10nmonster_user,
            password: ctx.env.l10nmonster_password,
            database: ctx.env.l10nmonster_database,
            cert: '/etc/ssl/cert.pem',
        });
        this.pipelines = {
            default: {
                source,
                resourceFilter,
                translationProvider: new XliffBridge({
                    ctx,
                    requestPath: (lang, prjId) => `xliff/outbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
                    completePath: (lang, prjId) => `xliff/inbox/prj${('0000' + prjId).substr(-4)}-${lang}.xml`,
                    quality: '080-human-single-pass',
                }),
                target,
            },
            piggy: {
                source,
                resourceFilter,
                translationProvider: new PigLatinizer(),
                target,
            },
        };
    }
}
