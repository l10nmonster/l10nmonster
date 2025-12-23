import { config, policies, xml, normalizers, filters, stores, providers } from 'l10nmonster';
import * as java from 'l10nmonster/java';
import * as demo from 'l10nmonster/demo';

import { MySource, MyTarget } from './myAdapter.mjs';

export default config.l10nMonster(import.meta.dirname)
    .channel(config.channel('txt')
        .source(new MySource({
            sourceLang: 'en',
            baseDir: 'resources',
            globs: ['*_en.txt'],
            resourceFormat: 'MNFv1',
        }))
        .policy(policies.fixedTargets(['piggy'], 1))
        .target(new MyTarget({
            targetPath: (lang, resourceId) => `resources/${resourceId.replace('_en.txt', `_${lang}.txt`)}`,
        }))
        .resourceFormat(config.resourceFormat('MNFv1')
            .resourceFilter(new filters.MNFv1Filter()))
            .messageFormat(config.messageFormat('java')
                .decoders([java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder])
                .textEncoders([normalizers.gatedEncoder(xml.entityEncoder, 'xmlDecoder', 'xmlEntityDecoder')])))
    .provider(new demo.providers.PigLatinizer({ quality: 1 }))
    .tmStore(new stores.FsJsonlTmStore({
        id: 'storeA',
        partitioning: 'language',
        jobsDir: 'storeA',
    }))
    .tmStore(new stores.FsJsonlTmStore({
        id: 'storeB',
        partitioning: 'language',
        jobsDir: 'storeB',
    }));
