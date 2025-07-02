import { L10nMonsterConfig, ChannelConfig, policies, adapters, providers } from '@l10nmonster/core';
import * as po from '@l10nmonster/helpers-po';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('gramps')
        .source(new adapters.FsSource({
            globs: ['artifacts/*.pot'],
            sourceLang: 'en',
        }))
        .resourceFilter(new po.Filter())
        .policy(policies.fixedTargets(['ja', 'it'], 50))
        .target(new adapters.FsTarget({
            targetPath: (lang) => `artifacts/${lang}.po`,
        })))
    .provider(new providers.InternalLeverage())
    .provider(new providers.Repetition())
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new demo.providers.PigLatinizer({ quality: 2 }))
;