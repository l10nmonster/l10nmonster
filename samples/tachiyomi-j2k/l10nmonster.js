import { L10nConfig } from '../../src/l10nConfig.js';
import { FsSource, FsTarget } from '../../src/adapters/fs.js';
import { AndroidFilter } from '../../src/filters/android.js';
import { XliffBridge } from '../../src/translators/xliff.js';
import { PigLatinizer } from '../../src/translators/piglatinizer.js';

const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class TachiyomiConfig extends L10nConfig {
    constructor(ctx) {
        super(ctx);
        const source = new FsSource({
            baseDir: ctx.baseDir,
            globs: [ '**/values/strings.xml' ],
        });
        const resourceFilter = new AndroidFilter({
            comment: 'pre',
        });
        const target = new FsTarget({
            baseDir: ctx.baseDir,
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });
        
        // this.debug.logRequests = true;
        // this.debug.logResponses = true;
        this.targetLangs = [ 'ja', 'it' ];
        this.pipelines = {
            default: {
                source,
                resourceFilter,
                translationProvider: new XliffBridge({
                    baseDir: ctx.baseDir,
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
