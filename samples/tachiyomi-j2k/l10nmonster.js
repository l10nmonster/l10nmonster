import { JsonJobStore } from '../../src/jsonJobStore.js';
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
        
        this.jobStore = new JsonJobStore({
            ctx,
            jobsDir: 'translationJobs',
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
