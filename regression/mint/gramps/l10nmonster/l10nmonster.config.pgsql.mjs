import { L10nMonsterConfig, ChannelConfig, policies, adapters, providers } from '@l10nmonster/core';
import { PoFilter } from '@l10nmonster/helpers-po';
import * as demo from '@l10nmonster/helpers-demo';
import { PostgresDALManager, PgSuperStore } from '@l10nmonster/helpers-pgsql';

const dbName = process.env.PGSQL_DB_NAME || 'l10n_regression_gramps';
const connectionString = `postgresql://localhost/${dbName}`;

const superStore = new PgSuperStore({ connectionString });

export default new L10nMonsterConfig(import.meta.dirname)
    .dalManager(new PostgresDALManager({ connectionString }))
    .channel(new ChannelConfig('po')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [
                'artifacts/*.pot',
            ],
        }))
        .resourceFilter(new PoFilter())
        .policy(policies.fixedTargets([ 'ja' ], 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang) => `artifacts/${lang}.po`,
        })))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
    .provider(new demo.providers.PigLatinizer({ quality: 2 }))
    .tmStore(superStore.createTmStore({
        id: 'default',
        partitioning: 'language',
    }))
    .snapStore(superStore.createSnapStore({
        id: 'local',
    }))
    ;
