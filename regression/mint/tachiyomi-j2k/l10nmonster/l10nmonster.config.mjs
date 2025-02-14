import { L10nMonsterConfig, normalizers, xml, adapters, translators } from '@l10nmonster/core';
import * as android from '@l10nmonster/helpers-android';
import * as xliff from '@l10nmonster/helpers-xliff';
import * as demo from '@l10nmonster/helpers-demo';

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        targetLangs: [ 'zh-Hans', 'zh-Hant', 'piggy' ],
        minimumQuality: (job) => (job.targetLang === 'piggy' ? 1 : 50),
    })
    .contentType({
        source: new adapters.FsSource({
            baseDir: '..',
            globs: [ '**/values/strings*.xml' ],
        }),
        resourceFilter: new android.AndroidXMLFilter(),
        decoders: [ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, xml.tagDecoder, android.phDecoder ],
        textEncoders: [ android.escapesEncoder, xml.entityEncoder ],
        codeEncoders: [ normalizers.gatedEncoder(xml.entityEncoder, 'xmlCDataDecoder') ],
        target: new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        }),
    })
    .translators({
        PigLatinizer: {
            translator: new demo.PigLatinizer({ quality: 1 }),
            pairs: { en: [ 'piggy' ]},
        },
        XliffBridge: {
            translator: new xliff.XliffBridge({
                requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
                completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
                quality: 80,
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
    });
