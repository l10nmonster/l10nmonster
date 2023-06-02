const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

const { setCtx, sharedCtx } = require('@l10nmonster/helpers');

module.exports = class MultiProjectConfig2 {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ helpers, adapters }) {
        setCtx(helpers.sharedCtx());
        const ios = require('@l10nmonster/helpers-ios');
        const android = require('@l10nmonster/helpers-android');
        this.contentTypes = {
            ios: {
                source: new adapters.FsSource({
                    globs: [ '../CardboardSDK/**/en.lproj/*.strings' ],
                    targetLangs: [ 'ar', 'it', 'ja' ],
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
