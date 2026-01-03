import { L10nMonsterConfig, ChannelConfig, policies, xml, adapters, providers } from '@l10nmonster/core';
import { HTMLFilter } from '@l10nmonster/helpers-html';
import { PgSuperStore } from '@l10nmonster/helpers-pgsql';

const dbName = process.env.PGSQL_DB_NAME || 'l10n_regression_html';
const connectionString = `postgresql://localhost/${dbName}`;

const superStore = new PgSuperStore({ connectionString });

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('html')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ 'en/*.html' ],
        }))
        .resourceFilter(new HTMLFilter())
            .decoders([ xml.tagDecoder, xml.entityDecoder ])
        .policy(policies.fixedTargets([ 'en-ZZ' ], 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        })))
    .provider(new providers.InvisicodeProvider({
        quality: 2,
        supportedPairs: { 'en': [ 'en-ZZ' ] },
    }))
    .tmStore(superStore.createTmStore({
        id: 'default',
        partitioning: 'language',
    }))
;
