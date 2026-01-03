import path from 'path';
import fs from 'fs';
import { config, policies, normalizers, xml, adapters, providers } from '@l10nmonster/core';
import * as android from '@l10nmonster/helpers-android';
import * as xliff from '@l10nmonster/helpers-xliff';
import * as demo from '@l10nmonster/helpers-demo';
import { PgSuperStore } from '@l10nmonster/helpers-pgsql';

const dbName = process.env.PGSQL_DB_NAME || 'l10n_regression_tachiyomi-shards';
const connectionString = `postgresql://localhost/${dbName}`;

const superStore = new PgSuperStore({ connectionString });

const androidLangMapping = {
    'zh-Hans': 'zh-rCN',
    'zh-Hant': 'zh-rTW',
};

export default config.l10nMonster(import.meta.dirname)
    .channel(config.channel('xliff')
        .source(new adapters.FsSource({
            sourceLang: 'en',
            baseDir: '..',
            globs: [ '**/values/strings*.xml' ],
        }))
        .resourceFilter(new android.AndroidXMLFilter())
        .decoders([ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, xml.tagDecoder, android.phDecoder ])
        .textEncoders([ android.escapesEncoder, xml.entityEncoder ])
        .codeEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlCDataDecoder') ])
        .policy(policies.fixedTargets([ 'en-GB', 'zh-Hans', 'zh-Hant' ], 50))
        .policy(policies.fixedTargets('piggy', 1))
        .target(new adapters.FsTarget({
            baseDir: '..',
            targetPath: (lang, resourceId) => resourceId.replace('values', `values-${androidLangMapping[lang] || lang}`),
        })))
    .provider(new providers.LanguageVariantProvider({
        id: 'BritishTranslator',
        baseLang: 'en',
        dict: JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'dict.json'), 'utf-8')),
        quality: 50,
        supportedPairs: { en: [ 'en-GB' ] },
    }))
    .provider(new demo.providers.PigLatinizer({ quality: 1, supportedPairs: { en: [ 'piggy' ]} }))
    .provider(new xliff.providers.XliffBridge({
        requestPath: (lang, prjId) => `xliff/outbox/prj${prjId}-${lang}.xml`,
        completePath: (lang, prjId) => `xliff/inbox/prj${prjId}-${lang}.xml`,
        quality: 80,
        supportedPairs: { en: [ 'zh-Hans', 'zh-Hant' ] },
    }))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new providers.Repetition({ qualifiedPenalty: 1, unqualifiedPenalty: 9 }))
    .tmStore(superStore.createTmStore({
        id: 'job',
        tmStoreId: 'job',
        partitioning: 'job'
    }))
    .tmStore(superStore.createTmStore({
        id: 'provider',
        tmStoreId: 'provider',
        partitioning: 'provider'
    }))
    .tmStore(superStore.createTmStore({
        id: 'language',
        tmStoreId: 'language',
        partitioning: 'language'
    }))
;
