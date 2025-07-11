import { L10nMonsterConfig, ChannelConfig, policies, decorators, xml, adapters, providers } from '@l10nmonster/core';
import { i18next } from '@l10nmonster/helpers-json';

class ReactConfig extends L10nMonsterConfig {
    #sg;

    constructor() {
        super(import.meta.dirname);
        this.#sg = new decorators.SequenceGenerator('seqMap.json', 100);
        this.channel(new ChannelConfig('react')
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
            .policy(policies.fixedTargets([ 'de', 'ru' ], 1))
            .target(new adapters.FsTarget({
                baseDir: '..',
                targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
            })));
        this.provider(new providers.Grandfather({ quality: 70 }))
            .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
            .provider(new providers.Visicode({ quality: 2 }));
    }

    async init(mm) {
        await this.#sg.init(mm);
    }
}

export default new ReactConfig();
