import { L10nMonsterConfig, ChannelConfig, policies, adapters, providers } from '@l10nmonster/core';
import * as translated from '@l10nmonster/helpers-translated';
import * as android from '@l10nmonster/helpers-android';

const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('tachiyomi')
        .source(new adapters.FsSource({
            globs: ['**/values/strings.xml'],
            sourceLang: 'en',
        }))
        .resourceFilter(new android.Filter({
            comment: 'pre',
        }))
        .decoders([android.phDecoder])
        .segmentDecorators([
            (seg) => {
                if (seg.sid === 'adding_category_to_queue') {
                    seg.notes = {
                        desc: 'Command to add a category to a queue',
                        maxWidth: 50,
                        ph: {
                            '%1$s': {
                                sample: 'Manga',
                                desc: 'Category name'
                            },
                        },
                        screenshot: 'https://example.org',
                    }
                }
                return seg;
            }
        ])
        .policy(policies.fixedTargets(['ja', 'it'], 50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        })))
    .provider(new providers.InternalLeverage())
    .provider(new providers.Repetition({
        qualifiedPenalty: 1,
        unqualifiedPenalty: 9,
    }))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new translated.providers.TranslationOS({
        baseURL: 'https://api-sandbox.translated.com/v2',
        apiKey: process.env.TRANSLATED_API_KEY_SANDBOX,
        serviceType: 'premium',
        quality: 90,
    }));
