#!/usr/bin/env node

import * as path from 'path';
import {
  existsSync,
  mkdirSync,
} from 'fs';
import { Command, InvalidArgumentError } from 'commander';

import MonsterManager from './src/monsterManager.js';
import { OpsMgr } from './src/opsMgr.js';

import { JsonJobStore } from './stores/jsonJobStore.js';
import { SqlJobStore } from './stores/sqlJobStore.js';
import { JsonStateStore } from './stores/jsonStateStore.js';
import { SqlStateStore } from './stores/sqlStateStore.js';
import { FSTrafficStore } from './stores/fsTrafficStore.js';

import { analyzeCmd } from './src/analyzeCmd.js';
import { grandfatherCmd } from './src/grandfatherCmd.js';
import { leverageCmd } from './src/leverageCmd.js';
import { pullCmd } from './src/pullCmd.js';
import { pushCmd } from './src/pushCmd.js';
import { statusCmd } from './src/statusCmd.js';
import { tmxExportCmd } from './src/tmxExportCmd.js';
import { translateCmd } from './src/translateCmd.js';

import { FsSource, FsTarget } from './adapters/fs.js';
import { PoFilter } from './filters/po.js';
import { AndroidFilter } from './filters/android.js';
import { JavaPropertiesFilter } from './filters/java.js';
import { IosStringsFilter } from './filters/ios.js';
import { XliffBridge } from './translators/xliff.js';
import { PigLatinizer } from './translators/piglatinizer.js';
import { TranslationOS } from './translators/translationOS.js';
import { xmlDecoder, bracePHDecoder, iosPHDecoder,
    xmlEntityDecoder, javaEscapesDecoder,
    xmlEntityEncoder, javaEscapesEncoder,
    regexMatchingDecoderMaker } from './normalizers/regex.js';

const monsterCLI = new Command();

async function initMonster() {
  let baseDir = path.resolve('.'),
    previousDir = null;
  while (baseDir !== previousDir) {
    const configPath = path.join(baseDir, 'l10nmonster.mjs');
    if (existsSync(configPath)) {
        const verbose = monsterCLI.opts().verbose;
        const regression = monsterCLI.opts().regression;
        const build = monsterCLI.opts().build;
        const release = monsterCLI.opts().release;
        const prj = monsterCLI.opts().prj;
        const ops = monsterCLI.opts().ops;
        const opsMgr = ops ? new OpsMgr({ opsDir: path.join(baseDir, ops)}) : new OpsMgr();
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
                JsonJobStore, SqlJobStore, JsonStateStore, SqlStateStore, FSTrafficStore
            },
            adapters: {
                FsSource, FsTarget,
            },
            filters: {
                PoFilter, AndroidFilter, JavaPropertiesFilter, IosStringsFilter
            },
            normalizers: {
                xmlDecoder, bracePHDecoder, iosPHDecoder,
                xmlEntityDecoder, javaEscapesDecoder,
                xmlEntityEncoder, javaEscapesEncoder,
                regexMatchingDecoderMaker,
            },
            translators: {
                XliffBridge, PigLatinizer, TranslationOS
            },
        };
        for (const helperCategory of Object.values(helpers)) {
            for (const helper of Object.values(helperCategory))
                helper.prototype && (helper.prototype.ctx = ctx);
        }
      verbose && console.log(`Importing config from: ${configPath}`);
    const configModule = await import(configPath);
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
        console.log(`${status.pendingJobsNum.toLocaleString()} pending jobs`);
        for (const [lang, langStatus] of Object.entries(status.lang)) {
            console.log(`\nLanguage ${lang} (minimum quality ${langStatus.leverage.minimumQuality}, TM size:${langStatus.leverage.tmSize.toLocaleString()}):`);
            const totals = {};
            const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
            for (const [prj, leverage] of prjLeverage) {
                console.log(`  Project: ${prj}`);
                computeTotals(totals, leverage);
                printLeverage(leverage);
                if (monsterCLI.opts().verbose) {
                    for (const [rid, content] of Object.entries(langStatus.unstranslatedContent[prj] || {})) {
                        console.log(`      - ${rid}`);
                        for (const [sid, src] of Object.entries(content)) {
                            console.log(`        - ${sid}: ${sid === src ? '≣' : src}`);
                        }
                    }
                }
            }
            if (prjLeverage.length > 1) {
                console.log(`  Total:`);
                printLeverage(totals);
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
    .option('--leverage', 'eliminate internal repetitions from push')
    .action(async (options) => await withMonsterManager(async monsterManager => {
    const limitToLang = options.lang;
    const leverage = options.leverage;
      console.log(`Pushing content upstream...`);
      try {
        const status = await pushCmd(monsterManager, { limitToLang, leverage });
        if (status.length > 0) {
          for (const ls of status) {
            console.log(`${ls.num.toLocaleString()} translations units requested for language ${ls.targetLang} -> status: ${ls.status}`);
            leverage && console.log(`${ls.internalRepetitions.toLocaleString()} untranslated strings skipped because repeated`);
          }
        } else {
          console.log('Nothing to push!');
        }
      } catch (e) {
        console.error(`Failed to push: ${e}`);
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
    .action(async () => await withMonsterManager(async monsterManager => {
      console.log(`Pulling pending translations...`);
      const stats = await pullCmd(monsterManager);
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
        }
    }))
;

monsterCLI
    .command('tmxexport')
    .description('generate TMX resources based on the current translation memory.')
    .option('--all', 'export also entries with no translation')
    .option('-l, --lang <language>', 'target language to export')
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const all = options.all;
        const limitToLang = options.lang;
        console.log(`Exporting TMX for ${limitToLang ? limitToLang : 'all languages'}...`);
        const status = await tmxExportCmd(monsterManager, { limitToLang, all });
        console.log(`Generated files: ${status.files.join(', ')}`);
    }))
;

(async () => await monsterCLI.parseAsync(process.argv))();
