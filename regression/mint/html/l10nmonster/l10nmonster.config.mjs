import { L10nMonsterConfig, ChannelConfig, policies, xml, adapters, translators } from '@l10nmonster/core';
import { HTMLFilter } from '@l10nmonster/helpers-html';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        minimumQuality: 50,
    })
    .channel(new ChannelConfig('html')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ 'en/*.html' ],
        }))
        .resourceFilter(new HTMLFilter())
            .decoders([ xml.tagDecoder, xml.entityDecoder ])
        .policy(policies.fixedTargets([ 'it' ], 50))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        })))
    .translators({
        Piggy: {
            translator: new demo.PigLatinizer({ quality: 1 }),
            pairs: { en: [ 'it' ]},
        },
        Repetition: {
            translator: new translators.Repetition({
                qualifiedPenalty: 1,
                unqualifiedPenalty: 9,
            }),
        },
        Grandfather: {
            translator: new translators.Grandfather({
                quality: 70,
            }),
        },
    });
