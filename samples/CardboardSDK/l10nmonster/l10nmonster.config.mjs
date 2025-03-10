import fs from 'fs';
import { L10nMonsterConfig, ChannelConfig, L10nContext, normalizers, xml, stores, adapters, translators } from '@l10nmonster/core';
import * as ios from '@l10nmonster/helpers-ios';
import path from 'path';
// import translated from '@l10nmonster/helpers-translated';

// const defaultTOSConfig = {
//     baseURL: 'https://api-sandbox.translated.com/v2',
//     apiKey: l10nmonster.env.translated_api_key_sandbox,
//     serviceType: 'premium',
//     quality: 90,
// };

export const iosChannel = new ChannelConfig('ios', import.meta.dirname)
    .source(new adapters.FsSource({
        baseDir: '..',
        globs: [ '../**/en.lproj/*.strings' ],
        }))
    .resourceFilter(new ios.StringsFilter())
    .decoders([ ios.phDecoder, ios.escapesDecoder, xml.entityDecoder ])
    .textEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlEntityDecoder') ])
    .target(new adapters.FsTarget({
        targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
}));

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        targetLangSets: {
            LTR: [ 'en-GB', 'en-AU', 'it', 'ja' ],
            RTL: [ 'ar' ],
            debug: [ 'en-ZZ' ],
        },
        minimumQuality: 50,
    })
    .channel(iosChannel)
    .translators({
        BritishTranslator: {
            translator: new translators.VariantGenerator({
                dict: JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'dict.json'), 'utf-8')),
                quality: 70,
            }),
            pairs: { 'en': [ 'en-GB' ] },
        },
        AussieTranslator: {
            translator: new translators.VariantGenerator({
                dict: {
                    customise: 'tinkerise',
                    find: 'finday',
                },
                baseLang: 'en-GB',
                quality: 70,
            }),
            pairs: { 'en': [ 'en-AU' ] },
        },
        // TranslationOS: {
        //     translator: new translated.TranslationOS(defaultTOSConfig),
        //     pairs: { 'en': [ 'ar', 'it', 'ja' ] },
        // },
        // TOSLQA: { // fake sample of a "push and forget" configuration
        //     translator: new translated.TranslationOS({ ...defaultTOSConfig, serviceType: 'bugfix', requestOnly: true }),
        // },
        // ModernMT: {
        //     translator: new translated.ModernMT({
        //         apiKey: l10nmonster.env.mmt_api_key,
        //         quality: 40,
        //         maxCharLength: 1000,
        //     }),
        // },
        // DeepL: {
        //     translator: new translators.DeepL({
        //         apiKey: l10nmonster.env.deepl_api_key,
        //         quality: 40,
        //     }),
        //     quota: 0,
        // },
        // GCT: {
        //     translator: new translators.GoogleCloudTranslateV3({
        //         keyFilename: l10nmonster.env.gct_credentials,
        //         projectId: l10nmonster.env.gct_project,
        //         quality: 40,
        //     }),
        // },
        Invisicode: {
            translator: new translators.InvisicodeGenerator({
                quality: 50,
                lowQ: 50,
                highQ: 70,
            }),
            pairs: { 'en': [ 'en-ZZ' ] },
        },
        Visicode: {
            translator: new translators.Visicode({
                quality: 50,
            }),
        },
        Repetition: {
            translator: new translators.Repetition({
                qualifiedPenalty: 1,
                unqualifiedPenalty: 9,
            }),
        },
    })
    .operations({
        snapStore: new stores.FsSnapStore({
            snapDir: 'snap',
        }),
        tuFilters: {
            initial: tu => tu.sid.indexOf(L10nContext.arg) === 0,
        },
        opsDir: 'l10nOps',
    })
    .tmStore(new stores.FsJsonlTmStore({
        id: 'primary',
        jobsDir: 'tmStore',
        partitioning: 'language',
    }))
    .action(class mystats {
            static help = {
                description: 'just a demo of how to create your own commands',
                options: [
                    [ '-l, --lang <language>', 'restrict to language' ]
                ],
            };

            static async action(mm, options) {
                const targetLangs = mm.getTargetLangs(options.lang);
                for (const targetLang of targetLangs) {
                    const stats = {};
                    const allJobs = await mm.tmm.getJobStatusByLangPair(mm.sourceLang, targetLang);
                    allJobs.forEach(entry => stats[entry[1]] = (stats[entry[1].status] ?? 0) + 1);
                    console.log(`Target language ${targetLang}: ${stats.done ?? 0} done ${stats.pending ?? 0} pending ${stats.req ?? 0} req`);
                }
            }
        });
