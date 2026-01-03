import { L10nMonsterConfig, ChannelConfig, policies, adapters } from '@l10nmonster/core';
import { i18next } from '@l10nmonster/helpers-json';
import * as demo from '@l10nmonster/helpers-demo';
import { PostgresDALManager, PgSuperStore } from '@l10nmonster/helpers-pgsql';

const dbName = process.env.PGSQL_DB_NAME || 'l10n_regression_import-export';
const connectionString = `postgresql://localhost/${dbName}`;

const superStore = new PgSuperStore({ connectionString });

export default new L10nMonsterConfig(import.meta.dirname)
    .dalManager(new PostgresDALManager({ connectionString }))
    .channel(new ChannelConfig('json')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ 'source/*.json' ],
        }))
        .resourceFilter(new i18next.I18nextFilter())
        .policy(policies.fixedTargets('piggy', 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('source/', `translated/${lang}/`),
        })))
    .provider(new demo.providers.PigLatinizer({ quality: 1, supportedPairs: { en: [ 'piggy' ] } }))
    .snapStore(superStore.createSnapStore({
        id: 'local',
    }))
    ;
