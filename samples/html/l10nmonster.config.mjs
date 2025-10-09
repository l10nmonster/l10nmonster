import { L10nMonsterConfig, ChannelConfig, policies, xml, adapters, providers } from '@l10nmonster/core';
import { HTMLFilter } from '@l10nmonster/helpers-html';
import serve from '@l10nmonster/server';
import { LQABossActions, createLQABossRoutes } from '@l10nmonster/helpers-lqaboss';
import * as demo from '@l10nmonster/helpers-demo';

serve.registerExtension('lqaboss', createLQABossRoutes);

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('html')
        .source(new adapters.HttpSource({
            urlMap: {
                'www': 'https://info.cern.ch/hypertext/WWW/TheProject.html',
            },
            sourceLang: 'en',
        }))
        .resourceFilter(new HTMLFilter())
            .decoders([ xml.tagDecoder, xml.entityDecoder ])
            .textEncoders([ xml.entityEncoder ])
        .policy(policies.fixedTargets([ 'en', 'en-ZZ', 'piggy' ], 1))
        .target(new adapters.FsTarget({
            baseDir: '.',
            targetPath: (lang, resourceId) => `${resourceId}_${lang}.html`,
        })))
    .provider(new providers.InvisicodeProvider({
        quality: 2,
        supportedPairs: { 'en': [ 'en-ZZ' ] },
    }))
    .provider(new demo.providers.PigLatinizer({ quality: 1, supportedPairs: { en: [ 'piggy' ] } }))
    .action(LQABossActions)
    .action(serve)
;
