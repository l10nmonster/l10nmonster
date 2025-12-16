import fs from 'fs';
import { config, policies, normalizers, xml, stores, adapters, providers } from '@l10nmonster/core';
import serve from '@l10nmonster/server';
import * as ios from '@l10nmonster/helpers-ios';
// import * as xliff from '@l10nmonster/helpers-xliff';
import path from 'path';
import { GenAIAgent, GCSStoreDelegate, GDriveStoreDelegate } from '@l10nmonster/helpers-googlecloud';
import { AnthropicAgent } from '@l10nmonster/helpers-anthropic';
import { DeepLProvider } from '@l10nmonster/helpers-deepl';
import { LaraProvider, MMTProvider } from '@l10nmonster/helpers-translated';
import { GPTAgent } from '@l10nmonster/helpers-openai';
import { LQABossProvider, LQABossTmStore, createLQABossRoutes } from '@l10nmonster/helpers-lqaboss';
import { createMcpRoutes } from '@l10nmonster/mcp';

serve.registerExtension('lqaboss', createLQABossRoutes);
serve.registerExtension('mcp', createMcpRoutes);

// const defaultTOSConfig = {
//     baseURL: 'https://api-sandbox.translated.com/v2',
//     apiKey: l10nmonster.env.translated_api_key_sandbox,
//     serviceType: 'premium',
//     quality: 90,
// };

export const iosChannel = config.channel('ios', import.meta.dirname)
    .source(new adapters.FsSource({
        baseDir: '..',
        globs: 'en.lproj/*.strings',
        sourceLang: 'en',
        }))
    .resourceFilter(new ios.StringsFilter())
    .decoders([ ios.phDecoder, ios.escapesDecoder, xml.entityDecoder ])
    .textEncoders([ normalizers.gatedEncoder(xml.entityEncoder, 'xmlEntityDecoder') ])
    .policy(policies.fixedTargets(['ar', 'it', 'es', 'fr', 'de', 'ja', 'zh', 'en-ZZ', 'en-YY', 'en-GB', 'en-AU'], 30))
    .policy(policies.fixedTargets('en-ZZ', 20))
    .target(new adapters.FsTarget({
        targetPath: (lang, resourceId) => resourceId.replace('en.lproj/', `${lang}.lproj/`),
    }));

export default config.l10nMonster(import.meta.dirname)
    .channel(iosChannel)
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new providers.Repetition({
        holdInternalLeverage: true,
        expectedQuality: 80,
        qualifiedPenalty: 1,
        unqualifiedPenalty: 5,
        notesMismatchPenalty: 100,
    }))
    .provider(new providers.LanguageVariantProvider({
        id: 'BritishTranslator',
        dict: JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'dict.json'), 'utf-8')),
        baseLang: 'en',
        quality: 70,
        supportedPairs: { 'en': [ 'en-GB' ] },
    }))
    .provider(new providers.LanguageVariantProvider({
        id: 'AussieTranslator',
        dict: {
            customise: 'tinkerise',
            find: 'finday',
        },
        baseLang: 'en-GB',
        quality: 70,
        supportedPairs: { 'en': [ 'en-AU' ] },
    }))
    .provider(new providers.InvisicodeProvider({
        id: 'Invisicode',
        quality: 50,
        lowQ: 50,
        highQ: 70,
        supportedPairs: { 'en': [ 'en-ZZ' ] },
    }))
    .provider(new providers.Visicode({  
        id: 'Visicode',
        quality: 50,
        supportedPairs: { 'en': [ 'en-YY' ] },
    }))
    .provider(new DeepLProvider({
        id: 'DeepL',
        authKey: process.env.deepl_auth_key,
        formalityMap: {
            'it': 'more',
        },
        // modelType: 'quality_optimized', // this is disabled for free users
        quality: 50,
        supportedPairs: { 'en': [ 'de' ] },
    }))
    .provider(new LaraProvider({
        id: 'Lara',
        keyId: process.env.lara_key_id,
        keySecret: process.env.lara_key_secret,
        quality: 48,
        maxChunkSize: 50,
        supportedPairs: { 'en': [ 'fr' ] },
    }))
    // .provider(new GPTAgent({
    //     id: 'Ollama-LL',
    //     quality: 45,
    //     baseURL: 'http://127.0.0.1:11434/v1',
    //     // model: 'gemma3:27b',
    //     model: 'llama3.3:latest',
    //     // model: 'deepseek-r1:70b',
    //     // model: 'command-a:latest',
    //     // model: 'qwen2.5:72b',
    //     // supportedPairs: { 'en': [ 'it' ] },
    // }))
    .provider(new GPTAgent({
        id: 'gemini-openai',
        quality: 47,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.gemini_api_key,
        model: 'gemini-2.5-flash',
        // model: 'gemini-2.5-pro',
        defaultInstructions: 'You are translating strings from resource files of a mobile app.\nUse the following glossary: viewer=visore, Cardboard=Cardone',
        supportedPairs: { 'en': [ 'it' ] },
    }))
    .provider(new GenAIAgent({
        id: 'gemini-2.5-genai',
        quality: 48,
        apiKey: process.env.gemini_api_key,
        model: 'gemini-2.5-pro',
        parallelism: 10,
        // maxChunkSize:2,
        defaultInstructions: 'You are translating strings from resource files',
        targetLangInstructions: {
            'ar': 'use arabic numbers',
        },
        // thinkingBudget: 0,
        supportedPairs: { 'en': [ 'ar' ] },
    }))
    // .provider(new GenAIAgent({
    //     id: 'gemini-2.5-vertex',
    //     quality: 48,
    //     model: 'gemini-2.5-pro',
    //     // supportedPairs: { 'en': [ 'zh' ] },
    // }))
    .provider(new AnthropicAgent({
        id: 'claude-sonnet-4-vertex',
        quality: 48,
        // model: 'claude-opus-4@20250514',
        model: 'claude-sonnet-4@20250514',
        supportedPairs: { 'en': [ 'es' ] },
    }))
    .provider(new MMTProvider({
        quality: 40,
        apiKey: process.env.mmt_api_key,
        supportedPairs: { 'en': [ 'ja' ] },
        costPerMChar: 15,
    }))
    // .provider(new xliff.providers.XliffBridge({
    //     requestPath: (lang, jobId) => `outbox/job${jobId}-${lang}.xml`,
    //     completePath: (lang, jobId) => `inbox/job${jobId}-${lang}.xml`,
    //     quality: 80,
    // }))
    .provider(new LQABossProvider({
        id: 'LQABoss',
        delegate: new stores.FsStoreDelegate('lqaBoss'),
        // delegate: new GCSStoreDelegate('foobucket', 'lqaboss1'),
        // delegate: new GDriveStoreDelegate('1mZekxxxxxxxxxxxxxxxxxxxx'),
        quality: 80,
        qualityFile: 'mqm.json',
    }))
    .operations({
        opsStore: new stores.FsOpsStore(path.join(import.meta.dirname, 'l10nOps')),
        autoSnap: true,
        saveFailedJobs: false,
    })
    .snapStore(new stores.BaseFileBasedSnapStore(new stores.FsStoreDelegate('snaps'), { id: 'snaps', format: 'jsonl' }))
    .tmStore(new stores.FsJsonlTmStore({
        id: 'primary',
        jobsDir: 'tmStore',
        partitioning: 'job',
        // compressBlocks: true,
    }))
    .tmStore(new LQABossTmStore({
        id: 'lqaboss',
        delegate: new stores.FsStoreDelegate('lqaBoss'),
    }))
    .action(serve)
    .action(class mystats {
        static help = {
            description: 'just a demo of how to create your own commands',
            options: [
                [ '-l, --lang <language>', 'restrict to language' ]
            ],
        };

        static async action(mm, options) {
            const targetLangs = await mm.getTargetLangs(options.lang);
            for (const targetLang of targetLangs) {
                const stats = {};
                const allJobs = await mm.tmm.getJobStatusByLangPair(mm.sourceLang, targetLang);
                allJobs.forEach(entry => stats[entry[1]] = (stats[entry[1].status] ?? 0) + 1);
                console.log(`Target language ${targetLang}: ${stats.done ?? 0} done ${stats.pending ?? 0} pending ${stats.req ?? 0} req`);
            }
        }
    });
