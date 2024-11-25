const { adapters, normalizers, xml, translators, stores } = require('@l10nmonster/helpers');
const java = require('@l10nmonster/helpers-java');
const demo = require('@l10nmonster/helpers-demo');

module.exports = class EisenVaultConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'it' ];
    minimumQuality = 50;
    tmm = 'transient';

    constructor() {
        this.source = new adapters.FsSource({
            globs: [ '**/*_en.properties' ],
        });
        this.resourceFilter = new java.PropertiesFilter();
        this.decoders = [ normalizers.bracePHDecoder, xml.tagDecoder, java.escapesDecoder ];
        this.segmentDecorators = [
            seg => {
                if (seg.sid.indexOf('org.alfresco.blog.post-') === 0) {
                    return { ...seg, notes: 'PH({0}|Hello World|Item title / page link)' };
                }
                return seg;
            }
        ];
        this.target = new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('_en.properties', `_${lang.replace('-', '_')}.properties`),
        });
        this.translationProviders = {
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
        };
        this.jobStore = new stores.JsonJobStore({
            jobsDir: 'l10njobs',
        });
    }
}
