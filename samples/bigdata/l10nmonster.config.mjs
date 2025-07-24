import { config, policies, adapters, filters, providers } from '@l10nmonster/core';
import * as demo from '@l10nmonster/helpers-demo';
import serve from '@l10nmonster/server';
import BigDataSource from './bigDataSource.js';

export default config.l10nMonster(import.meta.dirname)
    .channel(config.channel('bigdata', import.meta.dirname)
        .source(new BigDataSource({
            bundles: 100000,
            ids: 5,
            contentSize: 800,
        }))
        .resourceFilter(new filters.MNFv1Filter())
            // .decoders([])
            // .textEncoders([])
        .policy(policies.fixedTargets('piggy', 50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        })))
    .provider(new providers.InternalLeverageHoldout())
    .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
    .provider(new demo.providers.PigLatinizer({ quality: 80, supportedPairs: { en: [ 'piggy' ] } }))
    .operations({ autoSnap: false })
    .action(serve)
;