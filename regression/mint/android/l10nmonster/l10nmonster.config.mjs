import { L10nMonsterConfig, ChannelConfig, normalizers, xml, stores, adapters, translators } from '@l10nmonster/core';
import * as android from '@l10nmonster/helpers-android';
import * as demo from '@l10nmonster/helpers-demo';

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
};

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        minimumQuality: (job) => (job.targetLang === 'piggy' ? 1 : 50),
    })
    .channel(new ChannelConfig('android')
        .source(new adapters.FsSource({
            baseDir: '..',
            globs: [ '**/values/strings*.xml' ],
            targetLangs: [ 'piggy' ],
        }))
        .resourceFilter(new android.AndroidXMLFilter())
        .decoders([ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, xml.tagDecoder, android.phDecoder ])
        .textEncoders([ android.escapesEncoder, xml.entityEncoder ])
        .codeEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlCDataDecoder') ])
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        })))
    .translators({
        PigLatinizer: {
            translator: new demo.PigLatinizer({ quality: 1 }),
            pairs: { en: [ 'piggy' ]},
        },
        Grandfather: {
            translator: new translators.Grandfather({
                quality: 70,
            }),
        },
    })
    .tmStore(new stores.FsLegacyJsonTmStore({
        id: 'default',
        jobsDir: 'translationJobs',
    }))
    ;
