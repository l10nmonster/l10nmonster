import { config, policies, normalizers, xml, adapters, translators, providers } from '@l10nmonster/core';
import * as android from '@l10nmonster/helpers-android';
import * as xliff from '@l10nmonster/helpers-xliff';
import * as demo from '@l10nmonster/helpers-demo';

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default config.l10nMonster(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        minimumQuality: (job) => (job.targetLang === 'piggy' ? 1 : 50),
    })
    .channel(config.channel('xliff')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ '**/values/strings*.xml' ],
        }))
        .resourceFilter(new android.AndroidXMLFilter())
        .decoders([ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, xml.tagDecoder, android.phDecoder ])
        .textEncoders([ android.escapesEncoder, xml.entityEncoder ])
        .codeEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlCDataDecoder') ])
        .policy(policies.fixedTargets([ 'zh-Hans', 'zh-Hant' ], 50))
        .policy(policies.fixedTargets('piggy', 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        })))
    .provider(new demo.providers.PigLatinizer({ quality: 1, supportedPairs: { en: [ 'piggy' ]} }))
    .provider(new xliff.providers.XliffBridge({
        requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
        completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
        quality: 80,
    }))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }));
