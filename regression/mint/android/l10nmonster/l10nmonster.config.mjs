import { L10nMonsterConfig, ChannelConfig, policies, normalizers, xml, stores, adapters, providers } from '@l10nmonster/core';
import * as android from '@l10nmonster/helpers-android';
import * as demo from '@l10nmonster/helpers-demo';

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
};

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('android')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ '**/values/strings*.xml' ],
        }))
        .resourceFilter(new android.AndroidXMLFilter())
        .decoders([ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, xml.tagDecoder, android.phDecoder ])
        .textEncoders([ android.escapesEncoder, xml.entityEncoder ])
        .codeEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlCDataDecoder') ])
        .policy(policies.fixedTargets('piggy', 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        })))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new demo.providers.PigLatinizer({ quality: 1, supportedPairs: { en: [ 'piggy' ] } }))
    .tmStore(new stores.FsLegacyJsonTmStore({
        id: 'default',
        jobsDir: 'translationJobs',
    }))
    ;
