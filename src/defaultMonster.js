import * as util from 'node:util';
import * as path from 'path';
import {
    existsSync,
    statSync,
    mkdirSync,
} from 'fs';
import * as winston from 'winston';

import { consoleColor } from './shared.js';

import MonsterManager from './monsterManager.js';
import { OpsMgr } from './opsMgr.js';

import { JsonJobStore } from './stores/jsonJobStore.js';
import { FsSnapStore } from './stores/fsSnapStore.js';

import { FsSource, FsTarget } from './adapters/fs.js';
import { HttpSource } from './adapters/http.js';
import { PoFilter } from './filters/po.js';
import { AndroidFilter } from './filters/android.js';
import { JavaPropertiesFilter } from './filters/java.js';
import { IosStringsFilter } from './filters/ios.js';
import { JsonFilter } from './filters/json.js';
import { HTMLFilter } from './filters/html.js';

import { Repetition } from './translators/repetition.js';
import { Grandfather } from './translators/grandfather.js';
import { XliffBridge } from './translators/xliff.js';
import { PigLatinizer } from './translators/piglatinizer.js';
import { TranslationOS } from './translators/translationOS.js';
import { Visicode } from './translators/visicode.js';
import { ModernMT } from './translators/modernMT.js';
import { DeepL } from './translators/deepL.js';
import { GoogleCloudTranslateV3 } from './translators/gctV3.js';
import { keywordTranslatorMaker }from './normalizers/keywordTranslatorMaker.js';
import * as regexNormalizers from './normalizers/regex.js';

import DuplicateSource from './analyzers/duplicateSource.js';
import SmellySource from './analyzers/smellySource.js';
import TextExpansionSummary from './analyzers/textExpansionSummary.js';
import FindByExpansion from './analyzers/findByExpansion.js';
import MismatchedTags from './analyzers/mismatchedTags.js';
import * as contentExporters from './analyzers/contentExport.js';

export async function createMonsterManager(configPath, options, cb) {
    if (!configPath) {
        throw 'missing configuration';
    }
    const baseDir = path.dirname(configPath);
    const configModule = await import(configPath);
    const configSeal = statSync(configPath).mtime.toISOString();
    const verboseOption = options.verbose;
    // eslint-disable-next-line no-nested-ternary
    const verboseLevel = (verboseOption === undefined || verboseOption === 0) ?
        'error' :
    // eslint-disable-next-line no-nested-ternary
        ((verboseOption === 1) ?
            'warn' :
            ((verboseOption === true || verboseOption === 2) ? 'info' : 'verbose'));
    const regression = options.regression;
    let prj = options.prj;
    prj && (prj = prj.split(','));
    const logger = winston.createLogger({
        level: verboseLevel,
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.ms(),
                    winston.format.timestamp(),
                    winston.format.printf(({ level, message, timestamp, ms }) => `${consoleColor.yellow}${timestamp.substr(11, 12)} (${ms}) [${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB] ${level}: ${typeof message === 'string' ? message : util.inspect(message)}${consoleColor.reset}`)
                ),
            }),
        ],
    });
    const opsMgr = configModule.opsDir ? new OpsMgr({ opsDir: path.join(baseDir, configModule.opsDir), logger }) : new OpsMgr({ logger });
    const ctx = {
        baseDir,
        opsMgr,
        env: process.env,
        arg: options.arg,
        logger,
        regression,
        prj,
    };
    const helpers = {
        stores: {
            JsonJobStore, FsSnapStore
        },
        adapters: {
            FsSource, FsTarget, HttpSource,
        },
        filters: {
            PoFilter, AndroidFilter, JavaPropertiesFilter, IosStringsFilter, JsonFilter, HTMLFilter
        },
        normalizers: {
            ...regexNormalizers,
            keywordTranslatorMaker,
        },
        translators: {
            Repetition, Grandfather, XliffBridge, PigLatinizer, TranslationOS, Visicode, ModernMT, DeepL, GoogleCloudTranslateV3
        },
    };
    for (const helperCategory of Object.values(helpers)) {
        for (const helper of Object.values(helperCategory))
            helper.prototype && (helper.prototype.ctx = ctx);
    }
    const defaultAnalyzers = {
        DuplicateSource, SmellySource, TextExpansionSummary, FindByExpansion, MismatchedTags, ...contentExporters
    };
    try {
        const configParams = { ctx, ...helpers };
        logger.verbose('Initializing config with:');
        logger.verbose(configParams);
        const monsterConfig = new configModule.default(configParams);
        logger.verbose('Successfully got config instance:');
        logger.verbose(monsterConfig, { depth: 5 });
        const monsterDir = path.join(baseDir, monsterConfig.monsterDir ?? '.l10nmonster');
        logger.info(`Monster dir: ${monsterDir}`);
        if (!existsSync(monsterDir)) {
            mkdirSync(monsterDir, {recursive: true});
        }
        const mm = await new MonsterManager({ monsterDir, monsterConfig, configSeal, ctx, defaultAnalyzers });
        ctx.mm = mm;
        logger.info(`L10n Monster initialized!`);
        if (cb) {
            try {
                await cb(mm);
            } catch(e) {
                console.error(`Unable to initialize: ${e.stack || e}`);
            }
        }
        return mm;
    } catch(e) {
        throw `l10nmonster.mjs failed to construct: ${e.stack || e}`;
    }
}
