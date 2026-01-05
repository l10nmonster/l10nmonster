import { L10nMonsterConfig, ChannelConfig, policies, adapters, providers } from 'l10nmonster';
import { PoFilter } from 'l10nmonster/po';
import * as demo from 'l10nmonster/demo';

export default new L10nMonsterConfig(import.meta.dirname)
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
    ;
