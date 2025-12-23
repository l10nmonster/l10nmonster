import { config, policies, xml, normalizers, filters, providers, stores } from 'l10nmonster';
import * as java from 'l10nmonster/java';
import * as demo from 'l10nmonster/demo';

import { MySource, MyTarget } from './myAdapter.mjs';

export default config.l10nMonster(import.meta.dirname)
    .channel(config.channel('java')
        .source(new MySource({
            sourceLang: 'en',
            baseDir: 'resources',
            globs: [ '*_en.txt' ],
            resourceFormat: 'MNFv1',
        }))
        .policy(policies.fixedTargets([ 'piggy' ], 1))
        .target(new MyTarget({
            targetPath: (lang, resourceId) => `resources/${resourceId.replace('_en.txt', `_${lang.replace('-', '_')}.txt`)}`,
        }))
        .resourceFormat(config.resourceFormat('MNFv1')
            .resourceFilter(new filters.MNFv1Filter()))
            .messageFormat(config.messageFormat('java')
                .decoders([ java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder, normalizers.doublePercentDecoder ])
                .textEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlDecoder', 'xmlEntityDecoder'), normalizers.gatedEncoder(normalizers.doublePercentEncoder, 'doublePercentDecoder') ])))
    .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
    .provider(new demo.providers.PigLatinizer({ quality: 1 }))
    .tmStore(new stores.FsLegacyJsonTmStore({
        id: 'legacy',
        jobsDir: 'translationJobs',
    }))
    .tmStore(new stores.FsJsonlTmStore({
        id: 'default',
        partitioning: 'language',
        jobsDir: 'tmStore',
    }))
    ;
