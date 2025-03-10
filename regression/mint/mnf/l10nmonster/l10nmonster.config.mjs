import { L10nMonsterConfig, ChannelConfig, ResourceFormatConfig, MessageFormatConfig, xml, normalizers, translators, filters, stores } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';
import * as demo from '@l10nmonster/helpers-demo';

import { MySource, MyTarget } from './myAdapter.mjs';

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        targetLangs: [ 'piggy' ],
        minimumQuality: (job) => (job.targetLang === 'piggy' ? 1 : 50),
    })
    .channel(new ChannelConfig('java')
        .source(new MySource({
            baseDir: 'resources',
            globs: [ '*_en.txt' ],
            resourceFormat: 'MNFv1',
        }))
        .target(new MyTarget({
            targetPath: (lang, resourceId) => `resources/${resourceId.replace('_en.txt', `_${lang.replace('-', '_')}.txt`)}`,
        }))
        .resourceFormat(new ResourceFormatConfig('MNFv1').resourceFilter(new filters.MNFv1Filter()))
        .messageFormat(new MessageFormatConfig('java')
            .decoders([ java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder, normalizers.doublePercentDecoder ])
            .textEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlDecoder', 'xmlEntityDecoder'), normalizers.gatedEncoder(normalizers.doublePercentEncoder, 'doublePercentDecoder') ])))
    .translators({
        PigLatinizer: {
            translator: new demo.PigLatinizer({ quality: 1 }),
            pairs: { en: [ 'piggy' ]},
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
    })
    .tmStore(new stores.FsLegacyJsonTmStore({
        id: 'legacy',
        jobsDir: 'translationJobs',
    }))
    .tmStore(new stores.FsJsonlTmStore({
        id: 'default',
        partitioning: 'language',
        jobsDir: 'tmStore',
    }))
    .operations({
        snapStore: new stores.FsSnapStore({ snapDir: 'snaps' }),
    });
