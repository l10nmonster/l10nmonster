const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class TachiyomiConfig {
    sourceLang = 'en';
    seqMap = 'seqMap.json';

    constructor({ ctx, stores, adapters, filters, normalizers, translators }) {
        this.source = new adapters.FsSource({
            globs: [ '**/values/strings.xml' ],
            targetLangs: [ 'ja', 'it' ],
        });
        this.resourceFilter = new filters.AndroidFilter({
            comment: 'pre',
        });
        // demo of how to programmatically update notes
        this.segmentEnricher = (seg) => {
            if (seg.sid === 'adding_category_to_queue') {
                seg.notes = {
                    desc: 'Command to add a category to a queue',
                    maxWidth: 50,
                    ph: {
                        '%1$s': {
                            sample: 'Manga',
                            desc: 'Category name'
                        },
                    },
                    screenshot: 'https://example.org',
                }
            }
        };
        this.decoders = [ normalizers.iosPHDecoder ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        });

        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'translationJobs',
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
        //     requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
        //     completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
        //     quality: 80,
        // });
        // const piggyTranslator = new translators.PigLatinizer({ quality: 1 });
        // this.translationProvider = (job) => (job.targetLang === 'piggy' ? piggyTranslator : xliffTranslator);
        // this.minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);
        this.translationProviders = {
            TranslationOS: {
                translator: new translators.TranslationOS({
                    baseURL: 'https://api-sandbox.translated.com/v2',
                    apiKey: ctx.env.translated_api_key_sandbox,
                    serviceType: 'premium',
                    quality: 90,
                }),
            },
            Repetition: {
                translator: new translators.Repetition({
                    qualifiedPenalty: 1,
                    unqualifiedPenalty: 9,
                }),
            },
            Grandfather: {
                translator: new translators.Grandfather({
                    quality: 70,
                }),
            },
        };
        this.minimumQuality = 50;
    }
}

export const opsDir = 'l10nOps';
