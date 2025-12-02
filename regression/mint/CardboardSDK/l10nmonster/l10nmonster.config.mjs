import { L10nMonsterConfig, ChannelConfig, policies, decorators, xml, adapters, providers } from '@l10nmonster/core';
import * as ios from '@l10nmonster/helpers-ios';

class CardboardConfig extends L10nMonsterConfig {
    #sg;

    constructor() {
        super(import.meta.dirname);
        this.#sg = new decorators.SequenceGenerator('seqMap.json');
        this.channel(new ChannelConfig('ios')
            .source(new adapters.FsSource({
                sourceLang: 'en',
                baseDir: '..',
                globs: [ '**/en.lproj/*.strings' ],
            }))
            .resourceFilter(new ios.StringsFilter())
                .segmentDecorators([ this.#sg.getDecorator() ])
                .decoders([ ios.phDecoder, ios.escapesDecoder ])
                .textEncoders([ xml.entityEncoder, ios.escapesEncoder ])
            .policy(policies.fixedTargets('ar', 50))
            .target(new adapters.FsTarget({
                baseDir: '..',
                targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`)
            })))
        .channel(new ChannelConfig('ios-stringsdict')
            .source(new adapters.FsSource({
                sourceLang: 'en',
                baseDir: '..',
                globs: [ '**/en.lproj/*.stringsdict' ],
            }))
            .resourceFilter(new ios.StringsdictFilter())
                .segmentDecorators([ this.#sg.getDecorator() ])
                .decoders([ ios.phDecoder, ios.escapesDecoder ])
                .textEncoders([ xml.entityEncoder, ios.escapesEncoder ])
            .policy(policies.fixedTargets('ar', 50))
            .policy(policies.minimizePluralForms())
            .target(new adapters.FsTarget({
                baseDir: '..',
                targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`)
            })))
        .provider(new providers.Grandfather({ quality: 70 }))
        .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
        .provider(new providers.Visicode({ quality: 60 }));
    }

    async init(mm) {
        await this.#sg.init(mm);
    }
}

export default new CardboardConfig();
