import { L10nMonsterConfig, ChannelConfig, policies, xml, adapters, providers } from '@l10nmonster/core';
import { HTMLFilter } from '@l10nmonster/helpers-html';
import { lqaboss } from '@l10nmonster/lqaboss-cli';

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('html')
        .source(new adapters.HttpSource({
            urlMap: {
                'mojibake': 'https://simple.wikipedia.org/wiki/Mojibake',
            },
            sourceLang: 'en',
        }))
        .resourceFilter(new HTMLFilter())
            .decoders([ xml.tagDecoder, xml.entityDecoder ])
            .textEncoders([ xml.entityEncoder ])
        .policy(policies.fixedTargets([ 'en', 'en-ZZ' ], 1))
        .target(new adapters.FsTarget({
            baseDir: '.',
            targetPath: (lang, resourceId) => `${lang}-${resourceId}.html`,
        })))
    .provider(new providers.InvisicodeProvider({
        quality: 2,
        supportedPairs: { 'en': [ 'en-ZZ' ] },
    }))
    .action(lqaboss)
;
