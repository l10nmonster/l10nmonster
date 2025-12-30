import { L10nMonsterConfig, ChannelConfig, policies, adapters, stores } from '@l10nmonster/core';
import { i18next } from '@l10nmonster/helpers-json';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
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
    .snapStore(new stores.BaseFileBasedSnapStore(
        new stores.FsStoreDelegate('snapshots'),
        { id: 'local', format: 'jsonl' }
    ))
    ;
