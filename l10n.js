#!/usr/bin/env node
/* eslint-disable no-negated-condition */

import * as path from 'path';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'fs';
import * as util from 'node:util';
import { Command, InvalidArgumentError } from 'commander';
import * as winston from 'winston';

import {
    consoleColor, fixCaseInsensitiveKey,
    printRequest, printResponse,
    printLeverage, computeTotals,
} from './src/shared.js';

import MonsterManager from './src/monsterManager.js';
import { OpsMgr } from './src/opsMgr.js';

import { JsonJobStore } from './src/stores/jsonJobStore.js';

import { analyzeCmd } from './src/analyzeCmd.js';
import { pullCmd } from './src/pullCmd.js';
import { pushCmd } from './src/pushCmd.js';
import { jobPushCmd } from './src/jobCmd.js';
import { statusCmd } from './src/statusCmd.js';
import { jobsCmd } from './src/jobsCmd.js';
import { tmExportCmd } from './src/tmExportCmd.js';
import { translateCmd } from './src/translateCmd.js';

import { FsSource, FsTarget } from './src/adapters/fs.js';
import { PoFilter } from './src/filters/po.js';
import { AndroidFilter } from './src/filters/android.js';
import { JavaPropertiesFilter } from './src/filters/java.js';
import { IosStringsFilter } from './src/filters/ios.js';
import { JsonFilter } from './src/filters/json.js';

import { Repetition } from './src/translators/repetition.js';
import { Grandfather } from './src/translators/grandfather.js';
import { XliffBridge } from './src/translators/xliff.js';
import { PigLatinizer } from './src/translators/piglatinizer.js';
import { TranslationOS } from './src/translators/translationOS.js';
import { Visicode } from './src/translators/visicode.js';
import { ModernMT } from './src/translators/modernMT.js';
import { DeepL } from './src/translators/deepL.js';
import * as regexNormalizers from './src/normalizers/regex.js';

import DuplicateSource from './src/analyzers/duplicateSource.js';
import SmellySource from './src/analyzers/smellySource.js';
import TextExpansionSummary from './src/analyzers/textExpansionSummary.js';
import FindByExpansion from './src/analyzers/findByExpansion.js';
import MismatchedTags from './src/analyzers/mismatchedTags.js';

const monsterCLI = new Command();

async function initMonster() {
  let baseDir = path.resolve('.'),
    previousDir = null;
  while (baseDir !== previousDir) {
    const configPath = path.join(baseDir, 'l10nmonster.mjs');
    if (existsSync(configPath)) {
        const configModule = await import(configPath);
        const configSeal = statSync(configPath).mtime.toISOString();
        const verboseOption = monsterCLI.opts().verbose;
            // eslint-disable-next-line no-nested-ternary
            const verboseLevel = (verboseOption === undefined || verboseOption === 0) ?
                'error' :
            // eslint-disable-next-line no-nested-ternary
                ((verboseOption === 1) ?
                    'warn' :
                    ((verboseOption === true || verboseOption === 2) ? 'info' : 'verbose'));
        const regression = monsterCLI.opts().regression;
        let prj = monsterCLI.opts().prj;
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
        const sourceMirrorDir = configModule.sourceMirrorDir && path.join(baseDir, configModule.sourceMirrorDir);
        const ctx = {
            baseDir,
            opsMgr,
            env: process.env,
            arg: monsterCLI.opts().arg,
            logger,
            regression,
            prj,
        };
        const helpers = {
            stores: {
                JsonJobStore
            },
            adapters: {
                FsSource, FsTarget,
            },
            filters: {
                PoFilter, AndroidFilter, JavaPropertiesFilter, IosStringsFilter, JsonFilter
            },
            normalizers: {
                ...regexNormalizers,
            },
            translators: {
                Repetition, Grandfather, XliffBridge, PigLatinizer, TranslationOS, Visicode, ModernMT, DeepL
            },
        };
        for (const helperCategory of Object.values(helpers)) {
            for (const helper of Object.values(helperCategory))
                helper.prototype && (helper.prototype.ctx = ctx);
        }
        const defaultAnalyzers = {
            DuplicateSource, SmellySource, TextExpansionSummary, FindByExpansion, MismatchedTags
        };
        logger.info(`Importing config from: ${configPath}`);
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
            const mm = await new MonsterManager({ monsterDir, monsterConfig, configSeal, ctx, defaultAnalyzers, sourceMirrorDir });
            ctx.mm = mm;
            logger.info(`L10n Monster initialized!`);
            return mm;
        } catch(e) {
            throw `l10nmonster.mjs failed to construct: ${e.stack || e}`;
        }
    }
    previousDir = baseDir;
    baseDir = path.resolve(baseDir, '..');
  }
  throw 'l10nmonster.mjs not found';
}

async function withMonsterManager(cb) {
  try {
    const monsterManager = await initMonster();
    try {
        await cb(monsterManager);
    } catch(e) {
        console.error(`Unable to operate: ${e.stack || e}`);
    } finally {
        await monsterManager.shutdown();
    }
  } catch(e) {
    console.error(`Unable to initialize: ${e.stack || e}`);
  }
}

// eslint-disable-next-line no-unused-vars
function intOptionParser(value, _dummyPrevious) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not an integer');
  }
  return parsedValue;
}

monsterCLI
    .name('l10n')
    .version('0.1.0', '--version', 'output the current version number')
    .description('Continuous localization for the rest of us.')
    .option('-v, --verbose [level]', '0=error, 1=warning, 2=info, 3=verbose', intOptionParser)
    .option('-p, --prj <prj1,...>', 'limit source to specified projects')
    .option('--arg <string>', 'optional config constructor argument')
    .option('--regression', 'keep variables constant during regression testing')
;

monsterCLI
    .command('status')
    .description('Translation status of content.')
    .option('-l, --lang <language>', 'only get status of target language')
    .option('-a, --all', 'show information for all projects, not just untranslated ones')
    .option('--output <filename>', 'write status to the specified file')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const all = Boolean(options.all);
        const output = options.output;
        const status = await statusCmd(monsterManager, { limitToLang });
        if (output) {
            writeFileSync(output, JSON.stringify(status, null, '\t'), 'utf8');
        } else {
            console.log(`${status.numSources.toLocaleString()} translatable resources`);
            for (const [lang, langStatus] of Object.entries(status.lang)) {
                console.log(`\n${consoleColor.bright}Language ${lang}${consoleColor.reset} (minimum quality ${langStatus.leverage.minimumQuality}, TM size:${langStatus.leverage.tmSize.toLocaleString()}):`);
                const totals = {};
                const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
                for (const [prj, leverage] of prjLeverage) {
                    computeTotals(totals, leverage);
                    const untranslated = leverage.pending + leverage.untranslated + leverage.internalRepetitions;
                    if (leverage.translated + untranslated > 0) {
                        (all || untranslated > 0) && console.log(`  Project: ${consoleColor.bright}${prj}${consoleColor.reset}`);
                        printLeverage(leverage, all);
                    }
                }
                if (prjLeverage.length > 1) {
                    console.log(`  Total:`);
                    printLeverage(totals, true);
                }
            }
        }
    }))
;

monsterCLI
    .command('jobs')
    .description('Unfinished jobs status.')
    .option('-l, --lang <language>', 'only get jobs for the target language')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const jobs = await jobsCmd(monsterManager, { limitToLang });
        for (const [lang, jobManifests] of Object.entries(jobs)) {
            if (jobManifests.length > 0) {
                console.log(`Target language ${consoleColor.bright}${lang}${consoleColor.reset}:`);
                for (const mf of jobManifests) {
                    const numUnits = mf.inflight?.length ?? mf.tus?.length ?? 0;
                    const lastModified = new Date(mf.updatedAt);
                    console.log(`  Job ${mf.jobGuid}: status ${consoleColor.bright}${mf.status}${consoleColor.reset} ${numUnits.toLocaleString()} ${mf.sourceLang} units with ${mf.translationProvider} - ${lastModified.toDateString()} ${lastModified.toLocaleTimeString()}`);
                }
            }
        }
    }))
;

monsterCLI
    .command('analyze')
    .description('Content reports and validation.')
    .argument('[analyzer]', 'name of the analyzer to run')
    .argument('[params...]', 'optional parameters to the analyzer')
    .option('-l, --lang <language>', 'target language to analyze (if TM analyzer)')
    .option('--output <filename>', 'filename to write the analysis to)')
    .action(async (analyzer, params, options) => await withMonsterManager(async monsterManager => {
        try {
            if (analyzer) {
                analyzer = fixCaseInsensitiveKey(monsterManager.analyzers, analyzer);
                const Analyzer = monsterManager.analyzers[analyzer];
                if (!Analyzer) {
                    throw `couldn't find a ${analyzer} analyzer`;
                }
                const analysis = await analyzeCmd(monsterManager, Analyzer, params, options.lang);
                const header = Analyzer.analysisStructure;
                if (options.output) {
                    const rows = header ? [ header, ...analysis].map(row => row.join(',')) : analysis;
                    rows.push('\n');
                    writeFileSync(options.output, rows.join('\n'));
                } else {
                    if (header) { // structured analysis
                        const groups = Analyzer.analysisGroupBy;
                        let previousGroup;
                        for (const row of analysis) {
                            if (groups) {
                                const currentGroup = row.map((col, idx) => (groups.includes(header[idx]) ? col : null));
                                const currentGroupSmashed = currentGroup.join('|');
                                if (currentGroupSmashed !== previousGroup) {
                                    previousGroup = currentGroupSmashed;
                                    console.log(row.map((col, idx) => ((col === null || col === undefined || !groups.includes(header[idx])) ? '' : `${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${consoleColor.bright}${col}${consoleColor.reset}`)).join('\t'));
                                }
                            }
                            console.log(row.map((col, idx) => ((col === null || col === undefined || (groups && groups.includes(header[idx]))) ? '' : `${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${col}`)).join('\t'));
                        }
                    } else { // unstructured analysis
                        console.log(analysis.join('\n'));
                    }
                }
            } else {
                console.log('Available analyzers:');
                for (const [name, analyzer] of Object.entries(monsterManager.analyzers)) {
                    console.log(`  - ${consoleColor.bright}${name} ${analyzer.helpParams ?? ''}${consoleColor.reset} ${analyzer.help}`);
                }
            }
        } catch (e) {
            console.error(`Failed to analyze: ${e.stack || e}`);
        }
    }))
;

monsterCLI
    .command('push')
    .description('Push source content upstream (send to translation).')
    .option('-l, --lang <language>', 'target language to push')
    .option('--filter <filter>', 'use the specified tu filter')
    .option('--driver <untranslated|source|tm|job:jobGuid>', 'driver of translations need to be pushed (default: untranslated)')
    .option('--leverage', 'eliminate internal repetitions from untranslated driver')
    .option('--refresh', 'refresh existing translations without requesting new ones')
    .option('--provider <name,...>', 'use the specified translation providers')
    .option('--instructions <instructions>', 'send the specified translation provider')
    .option('--dryrun', 'simulate translating and compare with existing translations')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const tuFilter = options.filter;
        const driverOption = options.driver ?? 'untranslated';
        const driver = {};
        if (driverOption.indexOf('job:') === 0) {
            driver.jobGuid = driverOption.split(':')[1];
        } else if ([ 'untranslated', 'source', 'tm' ].includes(driverOption)) {
            driver[driverOption] = true;
        } else {
            throw `invalid ${driverOption} driver`;
        }
        const refresh = options.refresh;
        const leverage = options.leverage;
        const dryRun = options.dryrun;
        const instructions = options.instructions;
        console.log(`Pushing content upstream...${dryRun ? ' (dry run)' : ''}`);
        try {
            if (dryRun) {
                const status = await pushCmd(monsterManager, { limitToLang, tuFilter, driver, refresh, leverage, dryRun, instructions });
                for (const langStatus of status) {
                    console.log(`\nDry run of ${langStatus.sourceLang} -> ${langStatus.targetLang} push:`);
                    printRequest(langStatus);
                }
            } else {
                let status = [];
                for (const provider of (options.provider ?? 'default').split(',')) {
                    const translationProviderName = provider.toLowerCase() === 'default' ? undefined : provider;
                    status.push(await pushCmd(monsterManager, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions }));
                }
                status = status.flat(1);
                    if (status.length > 0) {
                    for (const ls of status) {
                        if (ls.minimumJobSize !== undefined) {
                            console.log(`${ls.num.toLocaleString()} translations units for language ${ls.targetLang} not sent to provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} because you need at least ${ls.minimumJobSize}`);
                        } else {
                            console.log(`job ${ls.jobGuid} with ${ls.num.toLocaleString()} translations received for language ${consoleColor.bright}${ls.targetLang}${consoleColor.reset} from provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} -> status: ${consoleColor.bright}${ls.status}${consoleColor.reset}`);
                        }
                    }
                } else {
                    console.log('Nothing to push!');
                }
            }
        } catch (e) {
            console.error(`Failed to push: ${e.stack || e}`);
        }
    }))
;

monsterCLI
    .command('job')
    .description('Show contents and push pending jobs.')
    .option('--req <jobGuid>', 'show contents of a job request')
    .option('--res <jobGuid>', 'show contents of a job response')
    .option('--pairs <jobGuid>', 'show request/response pairs of a job')
    .option('--push <jobGuid>', 'push a blocked job to translation provider')
    .option('--delete <jobGuid>', 'delete a blocked/failed job')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const reqJobGuid = options.req;
        const resJobGuid = options.res;
        const pairsJobGuid = options.pairs;
        const pushJobGuid = options.push;
        const deleteJobGuid = options.delete;
        if (reqJobGuid !== undefined) {
            const req = await monsterManager.jobStore.getJobRequest(reqJobGuid);
            if (req) {
                console.log(`Showing request of job ${reqJobGuid} ${req.sourceLang} -> ${req.targetLang}`);
                printRequest(req);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (resJobGuid !== undefined) {
            const req = await monsterManager.jobStore.getJobRequest(resJobGuid);
            const res = await monsterManager.jobStore.getJob(resJobGuid);
            if (req && res) {
                console.log(`Showing response of job ${resJobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
                printResponse(req, res);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (pairsJobGuid !== undefined) {
            const req = await monsterManager.jobStore.getJobRequest(pairsJobGuid);
            const res = await monsterManager.jobStore.getJob(pairsJobGuid);
            if (req && res) {
                console.log(`Showing source-target pairs of job ${pairsJobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
                printResponse(req, res, true);
            } else {
                console.error('Could not fetch the specified job');
            }
        } else if (pushJobGuid !== undefined) {
            console.log(`Pushing job ${pushJobGuid}...`);
            try {
                const pushResponse = await jobPushCmd(monsterManager, pushJobGuid);
                console.log(`${pushResponse.num.toLocaleString()} translations units requested -> status: ${pushResponse.status}`);
            } catch (e) {
                console.error(`Failed to push job: ${e}`);
            }
        } else if (deleteJobGuid !== undefined) {
            console.log(`Deleting job ${deleteJobGuid}...`);
            try {
                const res = await monsterManager.jobStore.getJob(deleteJobGuid);
                if (res) {
                    console.error(`Can only delete blocked/failed jobs. This job has status: ${res.status}`);
                } else {
                    await monsterManager.jobStore.deleteJobRequest(deleteJobGuid);
                }
            } catch (e) {
                console.error(`Failed to push job: ${e}`);
            }
        } else {
            console.error(`Nothing to do!`);
        }
    }))
;

monsterCLI
    .command('pull')
    .description('Receive outstanding translation jobs.')
    .option('--partial', 'commit partial deliveries')
    .option('-l, --lang <language>', 'only get jobs for the target language')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const partial = options.partial;
        console.log(`Pulling pending translations...`);
        const stats = await pullCmd(monsterManager, { limitToLang, partial });
        console.log(`Checked ${stats.numPendingJobs.toLocaleString()} pending jobs, ${stats.doneJobs.toLocaleString()} done jobs, ${stats.newPendingJobs.toLocaleString()} pending jobs created, ${stats.translatedStrings.toLocaleString()} translated strings found`);
  }))
;

monsterCLI
    .command('translate')
    .description('Generate translated resources based on latest source and translations.')
    .option('-l, --lang <language>', 'target language to translate')
    .option('-d, --dryrun', 'simulate translating and compare with existing translations')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const dryRun = options.dryrun;
        console.log(`Generating translated resources for ${limitToLang ? limitToLang : 'all languages'}...${dryRun ? ' (dry run)' : ''}`);
        const status = await translateCmd(monsterManager, { limitToLang, dryRun });
        if (dryRun) {
            for (const [lang, diff] of Object.entries(status.diff)) {
                for (const [fname, lines] of Object.entries(diff)) {
                    console.log(`${lang}: diffing ${fname}\n${lines}`);
                }
            }
        } else {
            for (const [lang, files] of Object.entries(status.generatedResources)) {
                console.log(`  - ${lang}: ${files.length} resources generated`);
            }
            for (const [lang, files] of Object.entries(status.deleteResources)) {
                console.log(`  - ${lang}: ${files.length} resources deleted`);
            }
        }
    }))
;

monsterCLI
    .command('tmexport')
    .description('Export translation memory in various formats.')
    .requiredOption('-f, --format <tmx|json|job>', 'exported file format')
    .requiredOption('-m, --mode <source|tm>', 'export all source entries (including untranslated) or all tm entries (including missing in source)')
    .option('-l, --lang <language>', 'target language to export')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const format = options.format;
        const mode = options.mode;
        const limitToLang = options.lang;
        if (['job', 'json', 'tmx'].includes(format)) {
            if (['source', 'tm'].includes(mode)) {
                console.log(`Exporting TM in mode ${consoleColor.bright}${mode}${consoleColor.reset} and format ${consoleColor.bright}${format}${consoleColor.reset} for ${consoleColor.bright}${limitToLang ? limitToLang : 'all languages'}${consoleColor.reset}...`);
                const status = await tmExportCmd(monsterManager, { limitToLang, mode, format });
                console.log(`Generated files: ${status.files.join(', ')}`);
            } else {
                console.error('Invalid mode');
            }
        } else {
            console.error('Invalid export format');
        }
    }))
;

// this seems useless but it still initializes MonsterManager so it can be
// used as a no-op to test the config/initialization process
// lifted from https://www.asciiart.eu/mythology/monsters
monsterCLI
    .command('monster')
    .description('Just because...')
    .action(async () => await withMonsterManager(async () => {
        console.log(`
            _.------.                        .----.__
           /         \\_.       ._           /---.__  \\
          |  O    O   |\\\\___  //|          /       \`\\ |
          |  .vvvvv.  | )   \`(/ |         | o     o  \\|
          /  |     |  |/      \\ |  /|   ./| .vvvvv.  |\\
         /   \`^^^^^'  / _   _  \`|_ ||  / /| |     |  | \\
       ./  /|         | O)  O   ) \\|| //' | \`^vvvv'  |/\\\\
      /   / |         \\        /  | | ~   \\          |  \\\\
      \\  /  |        / \\ Y   /'   | \\     |          |   ~
       \`'   |  _     |  \`._/' |   |  \\     7        /
         _.-'-' \`-'-'|  |\`-._/   /    \\ _ /    .    |
    __.-'            \\  \\   .   / \\_.  \\ -|_/\\/ \`--.|_
 --'                  \\  \\ |   /    |  |              \`-
                       \\uU \\UU/     |  /   :F_P:
        `);
    }))
;

console.log(consoleColor.reset);
(async () => await monsterCLI.parseAsync(process.argv))();
