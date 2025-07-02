import { L10nMonsterConfig, ChannelConfig, policies, adapters, providers } from '@l10nmonster/core';
import * as ios from '@l10nmonster/helpers-ios';
import * as android from '@l10nmonster/helpers-android';

const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('ios')
        .source(new adapters.FsSource({
            globs: ['../CardboardSDK/**/en.lproj/*.strings'],
            sourceLang: 'en',
            resDecorator: resMeta => ({ ...resMeta, prj: 'CardboardSDK' }),
        }))
        .resourceFilter(new ios.StringsFilter())
        .decoders([ios.phDecoder, ios.escapesDecoder])
        .policy(policies.fixedTargets(['ar', 'it', 'ja'], 50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
        })))
    .channel(new ChannelConfig('android')
        .source(new adapters.FsSource({
            globs: ['../tachiyomi-j2k/**/values/strings.xml'],
            sourceLang: 'en',
            resDecorator: resMeta => ({ ...resMeta, prj: 'tachiyomi' }),
        }))
        .resourceFilter(new android.Filter({
            comment: 'pre',
        }))
        .decoders([android.phDecoder])
        .policy(policies.fixedTargets(['ja', 'it'], 50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        })))
    .provider(new providers.InternalLeverage())
    .provider(new providers.Repetition())
    .provider(new providers.Grandfather({ quality: 70 }));
