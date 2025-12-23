import { adapters, stores } from '@l10nmonster/core';
import ios from '@l10nmonster/helpers-ios';
import android from '@l10nmonster/helpers-android';
import { runL10nMonster } from '@l10nmonster/cli';

const androidLangMapping = {
    'pt-BR': 'pr-rBR',
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

const config = class MultiProjectConfig2 {
    sourceLang = 'en';
    targetLangs = [ 'ar', 'it', 'ja' ];
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
                resourceFilter: new android.Filter(),
                decoders: [ android.phDecoder ],
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
                }),
            },
        };
    }
};

(async () => await runL10nMonster('./selfContained.js', { config, verbose: 3 }, async l10n => {
    const status = await l10n.status();
    for (const [lang, ls] of Object.entries(status.lang)) {
        console.log(`Language ${lang}`);
        for (const [prj, ps] of Object.entries(ls.leverage.prjLeverage)) {
            console.log(`Project ${prj}: ${ps.untranslated} untranslated string`);
        }
    }
}))();
