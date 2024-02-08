const { MySource, MyTarget } = require('./MyAdapter.cjs');
const { regex, xml, normalizers, translators, filters, stores } = require('@l10nmonster/helpers');
const java = require('@l10nmonster/helpers-java');
const demo = require('@l10nmonster/helpers-demo');

const javaFormatters = {
    // decoders: [ java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder ],
    decoders: [ java.escapesDecoder, xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder, normalizers.doublePercentDecoder ],
    textEncoders: [ normalizers.gatedEncoder(xml.entityEncoder, 'xmlDecoder', 'xmlEntityDecoder'), normalizers.gatedEncoder(normalizers.doublePercentEncoder, 'doublePercentDecoder') ],
};  

module.exports = class MyConfig {
    sourceLang = 'en';
    targetLangs = [ 'piggy' ];  
    minimumQuality = (job) => (job.targetLang === 'piggy' ? 1 : 50);    
    snapStore = new stores.FsSnapStore({ snapDir: 'snaps' });
    jobStore = new stores.JsonJobStore({
        jobsDir: 'translationJobs',
    });
    translationProviders = {
        PigLatinizer: {
            translator: new demo.PigLatinizer({ quality: 1 }),
            pairs: { en: [ 'piggy' ]},
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
    channels = {
        java: {
            source: new MySource({
                globs: [ '*_en.txt' ],
                resourceFormat: 'MNFv1',
                baseDir: 'resources',
            }),
            target: new MyTarget({
                targetPath: (lang, resourceId) => `resources/${resourceId.replace('_en.txt', `_${lang.replace('-', '_')}.txt`)}`,
            }),
       }
    };
    formats = {
        MNFv1: {
            resourceFilter: new filters.MNFv1(),
            normalizers: {
                java: javaFormatters,
            },
        },
    };
}

const opsDir = 'l10nOps';
