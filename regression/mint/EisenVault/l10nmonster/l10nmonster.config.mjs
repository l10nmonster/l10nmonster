import { L10nMonsterConfig, ChannelConfig, policies, normalizers, xml, adapters, translators, providers } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        minimumQuality: 50,
    })
    .channel(new ChannelConfig('java')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ '**/*_en.properties' ],
        }))
        .resourceFilter(new java.PropertiesFilter())
        .decoders([ normalizers.bracePHDecoder, xml.tagDecoder, java.escapesDecoder ])
        .segmentDecorators([
            seg => {
                if (seg.sid.indexOf('org.alfresco.blog.post-') === 0) {
                    return { ...seg, notes: 'PH({0}|Hello World|Item title / page link)' };
                }
                return seg;
            }
        ])
        .policy(policies.fixedTargets('it', 50))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        })))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
    .provider(new demo.providers.PigLatinizer({ quality: 1, supportedPairs: { en: [ 'piggy' ] } }))
    ;
