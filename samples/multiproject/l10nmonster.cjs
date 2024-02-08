const { adapters, stores } = require('@l10nmonster/helpers');
const ios = require('@l10nmonster/helpers-ios');
const android = require('@l10nmonster/helpers-android');

const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

module.exports = class MultiProjectConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'ar', 'it', 'ja' ];
    minimumQuality = 50;
    jobStore = new stores.JsonJobStore({
        jobsDir: 'translationJobs',
    });

    constructor() {
        this.contentTypes = {
            ios: {
                source: new adapters.FsSource({
                    globs: [ '../CardboardSDK/**/en.lproj/*.strings' ],
                    prj: 'CardboardSDK',
                }),
                resourceFilter: new ios.StringsFilter(),
                decoders: [ ios.phDecoder, ios.escapesDecoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
                }),
            },
            android: {
                source: new adapters.FsSource({
                    globs: [ '../tachiyomi-j2k/**/values/strings.xml' ],
                    targetLangs: [ 'ja', 'it' ],
                    prj: 'tachiyomi',
                }),
                resourceFilter: new android.Filter({
                    comment: 'pre',
                }),
                decoders: [ android.phDecoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
                }),
            },
        };
    }
}
