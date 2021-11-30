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

import { FsSource, FsTarget } from './adapters/fs.js';
import { PoFilter } from './filters/po.js';
import { AndroidFilter } from './filters/android.js';
import { XliffBridge } from './translators/xliff.js';
import { PigLatinizer } from './translators/piglatinizer.js';

async function initMonster() {
  let baseDir = path.resolve('.'),
    previousDir = null;
  while (baseDir !== previousDir) {
    const configPath = path.join(baseDir, 'l10nmonster.js');
    if (existsSync(configPath)) {
      const monsterDir = path.join(baseDir, '.l10nmonster');
      if (!existsSync(monsterDir)) {
        mkdirSync(monsterDir);
      }
      const ctx = {
        baseDir,
        env: process.env,
      };
      JsonJobStore.prototype.ctx = ctx;
      SqlJobStore.prototype.ctx = ctx;
      const jobStores = {
        JsonJobStore, SqlJobStore,
      };
      FsSource.prototype.ctx = ctx;
      FsTarget.prototype.ctx = ctx;
      const adapters = {
          FsSource, FsTarget,
      };
      PoFilter.prototype.ctx = ctx;
      AndroidFilter.prototype.ctx = ctx;
      const filters = {
          PoFilter, AndroidFilter,
      };
      XliffBridge.prototype.ctx = ctx;
      PigLatinizer.prototype.ctx = ctx;
      const translators = {
          XliffBridge, PigLatinizer,
      };
      const configModule = await import(configPath);
      const monsterConfig = new configModule.default({ ctx, jobStores, adapters, filters, translators });
      return new MonsterManager({ monsterDir, monsterConfig });
    }
    previousDir = baseDir;
    baseDir = path.resolve(baseDir, '..');
  }
  return null;
}

function intOptionParser(value, dummyPrevious) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not an integer.');
  }
  return parsedValue;
}

const monsterCLI = new Command();

monsterCLI
    .name('l10n')
    .version('0.1.0')
    .description('Continuous localization for the rest of us.')
;

monsterCLI
    .command('status')
    .description('translation status of content.')
    .action(async () => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const status = await monsterManager.status();
      console.log(`${status.numSources} translatable resource`);
      console.log(`${status.pendingJobsNum} pending jobs`);
      for (const [lang, stats] of Object.entries(status.lang)) {
        console.log(`Language ${lang}:`);
        console.log(`  - strings in translation memory: ${stats.tusNum}`);
        for (const [q, num] of Object.entries(stats.translated).sort((a,b) => b[1] - a[1])) {
          console.log(`  - translated strings @ quality ${q}: ${num}`);
        }
        console.log(`  - untranslated strings: ${stats.unstranslated.toLocaleString()} (${stats.unstranslatedChars.toLocaleString()} chars - ${stats.unstranslatedWords.toLocaleString()} words - $${(stats.unstranslatedWords * .2).toFixed(2)})`);
      }
      await monsterManager.shutdown();
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

monsterCLI
    .command('push')
    .description('push source content upstream (send to translation).')
    .action(async () => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      console.log(`Pushing content upstream...`);
      const status = await monsterManager.push();
      if (status.length > 0) {
        for (const ls of status) {
          console.log(`${ls.num} translations units requested for language ${ls.lang} -> status: ${ls.status}`);
        }
      } else {
        console.log('Nothing to push!');
      }
      await monsterManager.shutdown();
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

monsterCLI
    .command('grandfather')
    .requiredOption('-q, --quality <level>', 'translation quality', intOptionParser)
    .description('grandfather existing translations as a translation job.')
    .action(async (options) => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const quality = options.quality || 50;
      console.log(`Grandfathering existing translations at quality level ${quality}...`);
      const status = await monsterManager.grandfather(quality);
      if (status.length > 0) {
        for (const ls of status) {
          console.log(`${ls.num} translations units grandfathered for language ${ls.lang}`);
        }
      } else {
        console.log('Nothing to grandfather!');
      }
      await monsterManager.shutdown();
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

monsterCLI
    .command('pull')
    .description('receive outstanding translation jobs.')
    .action(async () => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      console.log(`Pulling pending translations...`);
      const stats = await monsterManager.pull();
      console.log(`Checked ${stats.numPendingJobs} pending jobs, ${stats.translatedStrings} translated strings pulled`);
      await monsterManager.shutdown();
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

monsterCLI
    .command('translate')
    .description('generate translated resources based on latest source and translations.')
    .action(async () => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      console.log(`Generating translated resources...`);
      await monsterManager.translate();
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

(async () => await monsterCLI.parseAsync(process.argv))();
