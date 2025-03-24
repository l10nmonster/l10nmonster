import { L10nMonsterConfig, ChannelConfig, policies, decorators, xml, adapters, translators } from '@l10nmonster/core';
import { i18next } from '@l10nmonster/helpers-json';

class ReactConfig extends L10nMonsterConfig {
    #sg;

    constructor() {
        super(import.meta.dirname);
        this.#sg = new decorators.SequenceGenerator('seqMap.json', 100);
        this.basicProperties({
            sourceLang: 'en',
            minimumQuality: 50,
        })
        .channel(new ChannelConfig('react')
            .source(new adapters.FsSource({
                sourceLang: 'en',
                baseDir: '..',
                globs: [ '**/en/*.json' ],
            }))
            .resourceFilter(new i18next.I18nextFilter({
                enableArbAnnotations : true,
                enablePluralSuffixes : true,
                emitArbAnnotations : true,
            }))
                .segmentDecorators([ this.#sg.getDecorator() ])
                .decoders([ xml.tagDecoder, xml.entityDecoder, i18next.phDecoder ])
            .policy(policies.fixedTargets([ 'de', 'ru' ], 50))
            .target(new adapters.FsTarget({
                baseDir: '..',
                targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
            })))
        .translators({
            Visicode: {
                translator: new translators.Visicode({
                    quality: 2,
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
    }

    async init(mm) {
        await this.#sg.init(mm);
    }
}

export default new ReactConfig();
