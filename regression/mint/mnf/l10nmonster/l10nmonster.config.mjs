import { L10nMonsterConfig, xml, normalizers, translators, filters, stores } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';
import * as demo from '@l10nmonster/helpers-demo';

import { MySource, MyTarget } from './myAdapter.mjs';

const javaFormatters = {
    // decoders: [ java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder ],
    decoders: [ java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder, normalizers.doublePercentDecoder ],
    textEncoders: [ normalizers.gatedEncoder(xml.entityEncoder, 'xmlDecoder', 'xmlEntityDecoder'), normalizers.gatedEncoder(normalizers.doublePercentEncoder, 'doublePercentDecoder') ],
};

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        targetLangs: [ 'piggy' ],
        minimumQuality: (job) => (job.targetLang === 'piggy' ? 1 : 50),
    })
    .channel('java', {
        source: new MySource({
            baseDir: 'resources',
            globs: [ '*_en.txt' ],
            resourceFormat: 'MNFv1',
        }),
        target: new MyTarget({
            targetPath: (lang, resourceId) => `resources/${resourceId.replace('_en.txt', `_${lang.replace('-', '_')}.txt`)}`,
        }),
    })
    .format('MNFv1', {
        resourceFilter: new filters.MNFv1Filter(),
        normalizers: {
            java: javaFormatters,
        },
    })
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
    .operations({
        snapStore: new stores.FsSnapStore({ snapDir: 'snaps' }),
        jobStore: new stores.JsonJobStore({
            jobsDir: 'translationJobs',
        }),
    });
