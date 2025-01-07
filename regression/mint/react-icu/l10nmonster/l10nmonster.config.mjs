import { L10nMonsterConfig, decorators, xml, stores, adapters, translators } from '@l10nmonster/core';
import { i18next } from '@l10nmonster/helpers-json';

class ReactConfig extends L10nMonsterConfig {
    #sg;

    constructor() {
        super(import.meta.dirname);
        this.#sg = new decorators.SequenceGenerator('seqMap.json', 100);
        this.basicProperties({
            sourceLang: 'en',
            targetLangs: [ 'de', 'ru' ],
            minimumQuality: 50,
        })
        .contentType({
            source: new adapters.FsSource({
                baseDir: '..',
                globs: [ '**/en/*.json' ],
            }),
            resourceFilter: new i18next.I18nextFilter({
                enableArbAnnotations : true,
                enablePluralSuffixes : true,
                emitArbAnnotations : true,
            }),
            segmentDecorators: [ this.#sg.getDecorator() ],
            decoders: [ xml.tagDecoder, xml.entityDecoder, i18next.phDecoder ],
            target: new adapters.FsTarget({
                baseDir: '..',
                targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
            }),
        })
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
        })
        .operations({
            jobStore: new stores.JsonJobStore({
                jobsDir: 'translationJobs',
            }),
        });
    }

    async init(mm) {
        await this.#sg.init(mm);
    }
}

export default new ReactConfig();
