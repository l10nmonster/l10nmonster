#!/usr/bin/env node

import * as path from 'path';
import {
  existsSync,
  mkdirSync,
} from 'fs';
import { Command, InvalidArgumentError } from 'commander';

import MonsterManager from './src/monsterManager.js';
import { JsonJobStore } from './src/jsonJobStore.js';
import { SqlJobStore } from './src/sqlJobStore.js';
import { JsonStateStore } from './src/jsonStateStore.js';
import { SqlStateStore } from './src/sqlStateStore.js';

import { FsSource, FsTarget } from './adapters/fs.js';
import { PoFilter } from './filters/po.js';
import { AndroidFilter } from './filters/android.js';
import { JavaPropertiesFilter } from './filters/java.js';
import { IosStringsFilter } from './filters/ios.js';
import { XliffBridge } from './translators/xliff.js';
import { PigLatinizer } from './translators/piglatinizer.js';
import { TranslationOS } from './translators/translationOS.js';
import { xmlDecoder, bracePHDecoder, iosPHDecoder, xmlEntityDecoder, javaEscapesDecoder } from './normalizers/regex.js';

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
        const ctx = {
            baseDir,
            env: process.env,
            arg: monsterCLI.opts().arg,
            verbose,
            regression,
            build,
            release,
        };
      const helpers = {
        stores: {
          JsonJobStore, SqlJobStore, JsonStateStore, SqlStateStore,
        },
        adapters: {
          FsSource, FsTarget,
        },
        filters: {
            PoFilter, AndroidFilter, JavaPropertiesFilter, IosStringsFilter
          },
        normalizers: {
            xmlDecoder, bracePHDecoder, iosPHDecoder, xmlEntityDecoder, javaEscapesDecoder
          },
        translators: {
          XliffBridge, PigLatinizer, TranslationOS
        },
      };
      for (const helperCategory of Object.values(helpers)) {
        for (const helper of Object.values(helperCategory))
        helper.prototype.ctx = ctx;
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
        return new MonsterManager({ monsterDir, monsterConfig, build, release });
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
    .option('-a, --arg <string>', 'optional constructor argument')
    .option('-b, --build <type>', 'build type')
    .option('-r, --release <num>', 'release number')
    .option('-v, --verbose', 'output additional debug information')
    .option('--regression', 'keep variable constant during regression testing')
;

monsterCLI
    .command('status')
    .description('translation status of content.')
    .option('-q, --quality <level>', 'minimum translation quality to be considered translated', intOptionParser)
    .action(async (options) => await withMonsterManager(async monsterManager => {
        const status = await monsterManager.status(options.quality);
        console.log(`${status.numSources.toLocaleString()} translatable resources`);
        console.log(`${status.pendingJobsNum.toLocaleString()} pending jobs`);
        for (const [lang, langStatus] of Object.entries(status.lang)) {
            const leverage = langStatus.leverage;
            console.log(`Language ${lang} (minimum quality ${leverage.minimumQuality}):`);
            console.log(`  - strings in translation memory: ${leverage.tmSize.toLocaleString()}`);
            for (const [q, num] of Object.entries(leverage.translated).sort((a,b) => b[1] - a[1])) {
                console.log(`  - translated strings @ quality ${q}: ${num.toLocaleString()}`);
            }
            leverage.pending && console.log(`  - strings pending translation: ${leverage.pending.toLocaleString()}`);
            console.log(`  - untranslated strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * .2).toFixed(2)})`);
            if (monsterCLI.opts().verbose) {
                for (const [rid, content] of Object.entries(langStatus.unstranslatedContent)) {
                    console.log(`    - ${lang} ${rid}`);
                    for (const [sid, src] of Object.entries(content)) {
                        console.log(`      - ${sid}: ${src}`);
                    }
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
      const analysis = await monsterManager.analyze();
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
    .action(async () => await withMonsterManager(async monsterManager => {
      console.log(`Pushing content upstream...`);
      try {
        const status = await monsterManager.push();
        if (status.length > 0) {
          for (const ls of status) {
            console.log(`${ls.num.toLocaleString()} translations units requested for language ${ls.lang} -> status: ${ls.status}`);
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
      const status = await monsterManager.grandfather(quality, options.lang);
      if (status.error) {
        console.error(`Failed: ${status.error}`);
      } else {
        if (status.length > 0) {
          for (const ls of status) {
            console.log(`${ls.num.toLocaleString()} translations units grandfathered for language ${ls.lang}`);
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
    .requiredOption('-q, --qualified <level>', 'quality of qualified repetitions', intOptionParser)
    .requiredOption('-u, --unqualified <level>', 'quality of unqualified repetitions', intOptionParser)
    .option('-l, --lang <language>', 'target language to leverage')
    .action(async (options) => await withMonsterManager(async monsterManager => {
      console.log(`Leveraging translations of repetitions...`);
      const status = await monsterManager.leverage(options.qualified, options.unqualified, options.lang);
      if (status.error) {
        console.error(`Failed: ${status.error}`);
      } else {
        if (status.length > 0) {
          for (const ls of status) {
            console.log(`${ls.num.toLocaleString()} translations leveraged for language ${ls.lang}`);
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
      const stats = await monsterManager.pull();
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
        const status = await monsterManager.translate({ limitToLang, dryRun });
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

(async () => await monsterCLI.parseAsync(process.argv))();
