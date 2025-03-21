import { L10nMonsterConfig, ChannelConfig, normalizers, xml, adapters, translators } from '@l10nmonster/core';
import * as java from '@l10nmonster/helpers-java';
import * as demo from '@l10nmonster/helpers-demo';

export default new L10nMonsterConfig(import.meta.dirname)
    .basicProperties({
        sourceLang: 'en',
        minimumQuality: 50,
    })
    .channel(new ChannelConfig('java')
        .source(new adapters.FsSource({
            baseDir: '..',
            globs: [ '**/*_en.properties' ],
            targetLangs: [ 'it' ],
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
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        })))
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
