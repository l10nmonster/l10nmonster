import { L10nMonsterConfig, ChannelConfig, decorators, xml, adapters, translators } from '@l10nmonster/core';
import * as ios from '@l10nmonster/helpers-ios';

class CardboardConfig extends L10nMonsterConfig {
    #sg;

    constructor() {
        super(import.meta.dirname);
        this.#sg = new decorators.SequenceGenerator('seqMap.json');
        this.basicProperties({
            sourceLang: 'en',
            minimumQuality: 50,
        })
        .channel(new ChannelConfig('ios')
            .source(new adapters.FsSource({
                baseDir: '..',
                globs: [ '**/en.lproj/*.strings' ],
                targetLangs: [ 'ar' ],
            }))
            .resourceFilter(new ios.StringsFilter())
            .segmentDecorators([ this.#sg.getDecorator() ])
            .decoders([ ios.phDecoder, ios.escapesDecoder ])
            .textEncoders([ xml.entityEncoder, ios.escapesEncoder ])
            .target(new adapters.FsTarget({
                baseDir: '..',
                targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`)
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

export default new CardboardConfig();
