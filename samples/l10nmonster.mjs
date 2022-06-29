const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default class MultiProjectConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ adapters, filters, normalizers, stores }) {
        this.contentTypes = {
            ios: {
                source: new adapters.FsSource({
                    globs: [ 'CardboardSDK/**/en.lproj/*.strings' ],
                    targetLangs: [ 'ar', 'it', 'ja' ],
                    prj: 'CardboardSDK',
                }),
                resourceFilter: new filters.IosStringsFilter(),
                decoders: [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ],
                textEncoders: [ normalizers.xmlEntityEncoder, normalizers.javaEscapesEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
                }),
            },
            android: {
                source: new adapters.FsSource({
                    globs: [ 'tachiyomi-j2k/**/values/strings.xml' ],
                    targetLangs: [ 'ja', 'it' ],
                    prj: 'tachiyomi',
                }),
                resourceFilter: new filters.AndroidFilter({
                    comment: 'pre',
                }),
                decoders: [ normalizers.iosPHDecoder, normalizers.javaEscapesDecoder ],
                textEncoders: [ normalizers.xmlEntityEncoder, normalizers.javaEscapesEncoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
                }),
            },
        };
    }
}
