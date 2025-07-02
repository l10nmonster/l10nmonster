import { L10nMonsterConfig, ChannelConfig, policies, xml, adapters, providers } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('eisenvault')
        .source(new adapters.FsSource({
            globs: ['**/*_en.properties'],
            sourceLang: 'en',
            resDecorator: resMeta => ({ 
                ...resMeta, 
                prj: resMeta.id.split('/')[1].split('.')[0].split('-')[0]
            }),
        }))
        .resourceFilter(new java.PropertiesFilter())
        .decoders([xml.tagDecoder, java.escapesDecoder])
        .textEncoders([java.escapesEncoder])
        .policy(policies.fixedTargets(['it', 'ja', 'pt-BR'], 50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => 
                resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        })))
    .provider(new providers.InternalLeverage())
    .provider(new providers.Repetition())
    .provider(new providers.Grandfather({ quality: 70 }))
;