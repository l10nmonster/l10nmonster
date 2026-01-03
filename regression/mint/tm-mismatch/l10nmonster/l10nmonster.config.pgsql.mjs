import { config, policies, xml, normalizers, filters, stores } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';
import * as demo from '@l10nmonster/helpers-demo';
import { PostgresDALManager } from '@l10nmonster/helpers-pgsql';

import { MySource, MyTarget } from './myAdapter.mjs';

const dbName = process.env.PGSQL_DB_NAME || 'l10n_regression_tm-mismatch';
const connectionString = `postgresql://localhost/${dbName}`;

// Uses PostgresDALManager for pgsql DAL testing
// Keeps FsJsonlTmStore for storeA/storeB because test has pre-populated TM data
export default config.l10nMonster(import.meta.dirname)
    .dalManager(new PostgresDALManager({ connectionString }))
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
