import { L10nMonsterConfig, L10nContext, adapters, translators } from '@l10nmonster/core';
import { PoFilter } from '@l10nmonster/helpers-po';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        targetLangs: [ 'ja' ],
        minimumQuality: L10nContext.arg === 'prod' ? 95 : 0, // only push production builds
        })
    .contentType({
        source: new adapters.FsSource({
            baseDir: '..',
            globs: [
                'artifacts/*.pot',
            ],
        }),
        resourceFilter: new PoFilter(),
        target: new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang) => `artifacts/${lang}.po`,
        }),
    })
    .translators({
        PigLatinizer: {
            translator: new demo.PigLatinizer({
                quality: 2
            }),
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
