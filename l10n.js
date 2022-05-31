#!/usr/bin/env node
/* eslint-disable no-negated-condition */

import * as path from 'path';
import {
  existsSync,
  mkdirSync,
} from 'fs';
import { Command, InvalidArgumentError } from 'commander';

import { consoleColor, printRequest, printResponse } from './src/shared.js';

import MonsterManager from './src/monsterManager.js';
import { OpsMgr } from './src/opsMgr.js';

import { JsonJobStore } from './stores/jsonJobStore.js';
// import { SqlJobStore } from './stores/sqlJobStore.js';
import { JsonStateStore } from './stores/jsonStateStore.js';
// import { SqlStateStore } from './stores/sqlStateStore.js';
import { FSTrafficStore } from './stores/fsTrafficStore.js';

import { analyzeCmd } from './src/analyzeCmd.js';
import { grandfatherCmd } from './src/grandfatherCmd.js';
import { leverageCmd } from './src/leverageCmd.js';
import { pullCmd } from './src/pullCmd.js';
import { pushCmd } from './src/pushCmd.js';
import { jobPushCmd } from './src/jobCmd.js';
import { statusCmd } from './src/statusCmd.js';
import { jobsCmd } from './src/jobsCmd.js';
import { tmExportCmd } from './src/tmExportCmd.js';
import { translateCmd } from './src/translateCmd.js';

import { FsSource, FsTarget } from './adapters/fs.js';
import { PoFilter } from './filters/po.js';
import { AndroidFilter } from './filters/android.js';
import { JavaPropertiesFilter } from './filters/java.js';
import { IosStringsFilter } from './filters/ios.js';
import { JsonFilter } from './filters/json.js';
import { XliffBridge } from './translators/xliff.js';
import { PigLatinizer } from './translators/piglatinizer.js';
import { TranslationOS, TOSRefresh } from './translators/translationOS.js';
import { Visicode } from './translators/visicode.js';
import { ModernMT } from './translators/modernMT.js';
import { DeepL } from './translators/deepL.js';
import * as regexNormalizers from './normalizers/regex.js';

const monsterCLI = new Command();

async function initMonster() {
  let baseDir = path.resolve('.'),
    previousDir = null;
  while (baseDir !== previousDir) {
    const configPath = path.join(baseDir, 'l10nmonster.mjs');
    if (existsSync(configPath)) {
        const configModule = await import(configPath);
        const verbose = monsterCLI.opts().verbose;
        const regression = monsterCLI.opts().regression;
        const build = monsterCLI.opts().build;
        const release = monsterCLI.opts().release;
        let prj = monsterCLI.opts().prj;
        prj && (prj = prj.split(','));
        const opsDir = monsterCLI.opts().ops ?? configModule.opsDir;
        const opsMgr = opsDir ? new OpsMgr({ opsDir: path.join(baseDir, opsDir), verbose }) : new OpsMgr({ verbose });
        const ctx = {
            baseDir,
            opsMgr,
            env: process.env,
            arg: monsterCLI.opts().arg,
            verbose,
            regression,
            build,
            release,
            prj,
        };
        const helpers = {
            stores: {
                JsonJobStore, JsonStateStore, FSTrafficStore
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
                XliffBridge, PigLatinizer, TranslationOS, TOSRefresh, Visicode, ModernMT, DeepL
            },
        };
        for (const helperCategory of Object.values(helpers)) {
            for (const helper of Object.values(helperCategory))
                helper.prototype && (helper.prototype.ctx = ctx);
        }
        verbose && console.log(`Importing config from: ${configPath}`);
        try {
            const configParams = { ctx, ...helpers };
            if (verbose) {
                console.log('Initializing config with:');
                console.dir(configParams);
            }
            const monsterConfig = new configModule.default(configParams);
            if (verbose) {
                console.log('Successfully got config instance:');
                console.dir(monsterConfig, { depth: 5 });
            }
            const monsterDir = path.join(baseDir, monsterConfig.monsterDir ?? '.l10nmonster');
            verbose && console.log(`Monster dir: ${monsterDir}`);
            if (!existsSync(monsterDir)) {
                mkdirSync(monsterDir, {recursive: true});
            }
            MonsterManager.prototype.verbose = verbose;
            return new MonsterManager({ monsterDir, monsterConfig, ctx });
        } catch(e) {
            throw `l10nmonster.mjs failed to construct: ${e}`;
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
        console.error(`Unable to operate: ${e}`);
        console.error(e.stack);
    } finally {
        await monsterManager.shutdown();
    }
  } catch(e) {
    console.error(`Unable to initialize: ${e}`);
    console.error(e.stack);
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
    .version('0.1.0')
    .description('Continuous localization for the rest of us.')
    .option('-v, --verbose', 'output additional debug information')
    .option('--ops <opsDir>', 'directory to output debug operations')
    .option('-p, --prj <num>', 'limit to specified project')
    .option('-b, --build <type>', 'build type')
    .option('-r, --release <num>', 'release number')
    .option('-a, --arg <string>', 'optional constructor argument')
    .option('--regression', 'keep variable constant during regression testing')
;

function printLeverage(leverage) {
    const totalStrings = leverage.translated + leverage.pending + leverage.untranslated + leverage.internalRepetitions;
    console.log(`    - total strings for target language: ${totalStrings.toLocaleString()} (${leverage.translatedWords.toLocaleString()} translated words)`);
    for (const [q, num] of Object.entries(leverage.translatedByQ).sort((a,b) => b[1] - a[1])) {
        console.log(`    - translated strings @ quality ${q}: ${num.toLocaleString()}`);
    }
    console.log(`    - strings pending translation: ${leverage.pending.toLocaleString()} (${leverage.pendingWords.toLocaleString()} words)`);
    console.log(`    - untranslated unique strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * .2).toFixed(2)})`);
    console.log(`    - untranslated repeated strings: ${leverage.internalRepetitions.toLocaleString()} (${leverage.internalRepetitionWords.toLocaleString()} words)`);
}

function computeTotals(totals, partial) {
    for (const [ k, v ] of Object.entries(partial)) {
        if (typeof v === 'object') {
            totals[k] ??= {};
            computeTotals(totals[k], v);
        } else {
            totals[k] ??= 0;
            totals[k] += v;
        }
    }
}

monsterCLI
    .command('status')
    .description('translation status of content.')
    .option('-l, --lang <language>', 'only get status of target language')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const status = await statusCmd(monsterManager, { limitToLang });
        console.log(`${status.numSources.toLocaleString()} translatable resources`);
        for (const [lang, langStatus] of Object.entries(status.lang)) {
            console.log(`\nLanguage ${lang} (minimum quality ${langStatus.leverage.minimumQuality}, TM size:${langStatus.leverage.tmSize.toLocaleString()}):`);
            const totals = {};
            const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
            for (const [prj, leverage] of prjLeverage) {
                console.log(`  Project: ${prj}`);
                computeTotals(totals, leverage);
                printLeverage(leverage);
            }
            if (prjLeverage.length > 1) {
                console.log(`  Total:`);
                printLeverage(totals);
            }
        }
    }))
;

monsterCLI
    .command('jobs')
    .description('unfinished jobs status.')
    .option('-l, --lang <language>', 'only get jobs for the target language')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        const jobs = await jobsCmd(monsterManager, { limitToLang });
        for (const [lang, jobManifests] of Object.entries(jobs)) {
            if (jobManifests.length > 0) {
                console.log(`Target language ${lang}:`);
                for (const mf of jobManifests) {
                    const numUnits = mf.inflight?.length ?? mf.num ?? 0;
                    const lastModified = new Date(mf.updatedAt);
                    console.log(`  Job ${mf.jobGuid}: status ${consoleColor.bright}${mf.status}${consoleColor.reset} ${numUnits.toLocaleString()} ${mf.sourceLang} units with ${mf.translationProvider} - ${lastModified.toDateString()} ${lastModified.toLocaleTimeString()}`);
                }
            }
        }
    }))
;

monsterCLI
    .command('analyze')
    .description('source content report and validation.')
    .option('-s, --smell', 'detect smelly source')
    .action(async (options) => await withMonsterManager(async monsterManager => {
      const analysis = await analyzeCmd(monsterManager);
      console.log(`${analysis.numStrings.toLocaleString()} strings (${analysis.totalWC.toLocaleString()} words) in ${analysis.numSources.toLocaleString()} resources`);
      const qWC = analysis.qualifiedRepetitions.reduce((p, c) => p + (c.length - 1) * c[0].wc, 0);
      console.log(`${analysis.qualifiedRepetitions.length.toLocaleString()} locally qualified repetitions, ${qWC.toLocaleString()} duplicate word count`);
      if (monsterCLI.opts().verbose) {
        for (const qr of analysis.qualifiedRepetitions) {
          console.log(`${qr[0].wc.toLocaleString()} words, sid: ${qr[0].sid}, txt: ${qr[0].str}`);
          for (const r of qr) {
            console.log(`  - ${r.rid}`);
          }
        }
      }
      const uWC = analysis.unqualifiedRepetitions.reduce((p, c) => p + (c.length - 1) * c[0].wc, 0);
      console.log(`${analysis.unqualifiedRepetitions.length.toLocaleString()} unqualified repetitions, ${uWC.toLocaleString()} duplicate word count`);
      if (monsterCLI.opts().verbose) {
        for (const ur of analysis.unqualifiedRepetitions) {
          console.log(`${ur[0].wc.toLocaleString()} words, txt: ${ur[0].str}`);
          for (const r of ur) {
            console.log(`  - ${r.rid}, sid: ${r.sid}`);
          }
        }
      }
        if (options.smell) {
            for (const { rid, sid, str } of analysis.smelly) {
                monsterCLI.opts().verbose && console.log(`- ${rid}:${sid}:`);
                console.log(str);
            }
        }
    }))
;

monsterCLI
    .command('push')
    .description('push source content upstream (send to translation).')
    .option('-l, --lang <language>', 'target language to push')
    .option('--bugfixfilter <filter>', 'use the specified bugfix filter')
    .option('--bugfixdriver <source|tm|job:jobGuid>', 'drive the bugfix filter from the desired source')
    .option('--provider <name>', 'use the specified translation provider')
    .option('--leverage', 'eliminate internal repetitions from push')
    .option('-d, --dryrun', 'simulate translating and compare with existing translations')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const limitToLang = options.lang;
        let bugfixFilter, bugfixDriver, bugfixJobGuid;
        if (options.bugfixfilter || options.bugfixdriver) {
            bugfixFilter = options.bugfixfilter;
            bugfixDriver = options.bugfixdriver ?? 'tm';
            if (bugfixDriver.indexOf('job:') === 0) {
                bugfixJobGuid = bugfixDriver.split(':')[1];
            } else if (![ 'source', 'tm' ].includes(bugfixDriver)) {
                throw `invalid ${bugfixDriver} bugfix driver`;
            }
        }
        const translationProviderName = options.provider;
        const leverage = options.leverage;
        const dryRun = options.dryrun;
        console.log(`Pushing content upstream...${dryRun ? ' (dry run)' : ''}`);
        try {
            const status = await pushCmd(monsterManager, { limitToLang, bugfixFilter, bugfixDriver, bugfixJobGuid, translationProviderName, leverage, dryRun });
            if (dryRun) {
                for (const langStatus of status) {
                    console.log(`\nLanguage pair ${langStatus.sourceLang} -> ${langStatus.targetLang}`);
                    printRequest(langStatus);
                }
            } else {
                if (status.length > 0) {
                    for (const ls of status) {
                        if (ls.minimumJobSize !== undefined) {
                            console.log(`${ls.num.toLocaleString()} translations units for language ${ls.targetLang} not sent because minimum ${ls.minimumJobSize} size was not reached`);
                        } else {
                            console.log(`${ls.num.toLocaleString()} translations units requested for language ${ls.targetLang} on job ${ls.jobGuid} -> status: ${ls.status}`);
                        }
                    }
                } else {
                    console.log('Nothing to push!');
                }
            }
        } catch (e) {
            console.error(`Failed to push: ${e}`);
        }
    }))
;

monsterCLI
    .command('job')
    .description('show contents and push pending jobs.')
    .option('--req <jobGuid>', 'show contents of a job request')
    .option('--res <jobGuid>', 'show contents of a job response')
    .option('--pairs <jobGuid>', 'show request/response pairs of a job')
    .option('--push <jobGuid>', 'push a blocked job to translation provider')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const reqJobGuid = options.req;
        const resJobGuid = options.res;
        const pairsJobGuid = options.pairs;
        const pushJobGuid = options.push;
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
        } else {
            console.error(`Nothing to do!`);
        }
    }))
;

monsterCLI
    .command('grandfather')
    .description('grandfather existing translations as a translation job.')
    .requiredOption('-q, --quality <level>', 'translation quality', intOptionParser)
    .option('-l, --lang <language>', 'target language to import')
    .action(async (options) => await withMonsterManager(async monsterManager => {
      const quality = options.quality;
      console.log(`Grandfathering existing translations at quality level ${quality}...`);
      const status = await grandfatherCmd(monsterManager, quality, options.lang);
      if (status.error) {
        console.error(`Failed: ${status.error}`);
      } else {
        if (status.length > 0) {
          for (const ls of status) {
            console.log(`${ls.num.toLocaleString()} translations units grandfathered for language ${ls.targetLang}`);
          }
        } else {
          console.log('Nothing to grandfather!');
        }
      }
  }))
;

monsterCLI
    .command('leverage')
    .description('leverage repetitions as a translation job.')
    .option('-l, --lang <language>', 'target language to leverage')
    .action(async (options) => await withMonsterManager(async monsterManager => {
      console.log(`Leveraging translations of repetitions...`);
      const status = await leverageCmd(monsterManager, options.lang);
      if (status.error) {
        console.error(`Failed: ${status.error}`);
      } else {
        if (status.length > 0) {
          for (const ls of status) {
            console.log(`${ls.num.toLocaleString()} translations leveraged for language ${ls.targetLang}`);
          }
        } else {
          console.log('Nothing to leverage!');
        }
      }
  }))
;

monsterCLI
    .command('pull')
    .description('receive outstanding translation jobs.')
    .option('-l, --lang <language>', 'only get jobs for the target language')
    .action(async (options) => await withMonsterManager(async monsterManager => {
    const limitToLang = options.lang;
      console.log(`Pulling pending translations...`);
      const stats = await pullCmd(monsterManager, { limitToLang });
      console.log(`Checked ${stats.numPendingJobs.toLocaleString()} pending jobs, ${stats.translatedStrings.toLocaleString()} translated strings pulled`);
  }))
;

monsterCLI
    .command('translate')
    .description('generate translated resources based on latest source and translations.')
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
    .description('export translation memory in various formats.')
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

console.log(consoleColor.reset);
(async () => await monsterCLI.parseAsync(process.argv))();
