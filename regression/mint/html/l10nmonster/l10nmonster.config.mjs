import { L10nMonsterConfig, ChannelConfig, policies, xml, adapters } from '@l10nmonster/core';
import { HTMLFilter } from '@l10nmonster/helpers-html';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('html')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ 'en/*.html' ],
        }))
        .resourceFilter(new HTMLFilter())
            .decoders([ xml.tagDecoder, xml.entityDecoder ])
        .policy(policies.fixedTargets([ 'it' ], 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        })))
    .provider(new demo.providers.PigLatinizer({ id: 'Piggy', quality: 1 }))
    ;
