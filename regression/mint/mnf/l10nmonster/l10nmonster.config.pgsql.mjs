import { config, policies, xml, normalizers, providers, filters, stores } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';
import * as demo from '@l10nmonster/helpers-demo';
import { PgSuperStore } from '@l10nmonster/helpers-pgsql';

import { MySource, MyTarget } from './myAdapter.mjs';

const dbName = process.env.PGSQL_DB_NAME || 'l10n_regression_mnf';
const connectionString = `postgresql://localhost/${dbName}`;

const superStore = new PgSuperStore({ connectionString });

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
    // Use file-based store for 'legacy' (has pre-existing data in translationJobs/)
    .tmStore(new stores.FsLegacyJsonTmStore({
        id: 'legacy',
        jobsDir: 'translationJobs',
    }))
    // Use pgsql for 'default' store
    .tmStore(superStore.createTmStore({
        id: 'default',
        tmStoreId: 'default',
        partitioning: 'language',
    }))
    ;
