const { adapters, filters, xml, normalizers, stores } = require('@l10nmonster/helpers');
const ios = require('@l10nmonster/helpers-ios');
const android = require('@l10nmonster/helpers-android');
const html = require('@l10nmonster/helpers-html');
const demo = require('@l10nmonster/helpers-demo');

const StubbedSource = require('./stubbedSource.js');
const channel1 = require('./channel1.json');
// const channel2 = require('./channel2.json');

module.exports = class MultiFormtConfig {
    sourceLang = 'en';
    minimumQuality = 50;
    channels = {
        // this mimics an ipothetical custom channel (e.g. DB integration) that produces a
        // JSON output with potentially multiple message formats in each segment
        channel1: {
            source: new StubbedSource(channel1),
            target: new adapters.FsTarget({
                targetPath: (lang, resourceId) => `${resourceId}-${lang}.json`,
            }),
            // defaultResourceFormat: ,
        },
    };

    formats = {
        MNFv1: {
            resourceFilter: new filters.MNFv1(),
            normalizers: {
                iosMF: {
                    decoders: [ ios.phDecoder, ios.escapesDecoder ],
                    // textEncoders: config.textEncoders,
                    // codeEncoders: ,
                    // joiner: ,
                },
                androidMF: {
                    decoders: [ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, android.phDecoder, normalizers.doublePercentDecoder ],
                },
                nstrMF: filters.MNFv1.normalizer,
            },
            // defaultMessageFormat: ,
            // segmentDecorators: [],

        },
        html: {
            resourceFilter: new html.Filter(),
            normalizers: {
                html: {
                    decoders: [ xml.tagDecoder, xml.entityDecoder ],
                    textEncoders: [ xml.entityEncoder ],
                }
            },
            defaultMessageFormat: 'html',
        }
    };

    jobStore = new stores.JsonJobStore({
        jobsDir: 'translationJobs',
    });

    snapStore = new stores.FsSnapStore({
        snapDir: 'snap',
    });

    translationProvider = new demo.PigLatinizer({
        quality: 2
    });
}
