#!/usr/bin/env node

import * as path from 'path';
import {
  existsSync,
  mkdirSync,
} from 'fs';
import { Command } from 'commander';

import MonsterManager from './src/monsterManager.js';

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
      const configModule = await import(configPath);
      const monsterConfig = new configModule.default(ctx);
      return new MonsterManager({ monsterDir, monsterConfig });
    }
    previousDir = baseDir;
    baseDir = path.resolve(baseDir, '..');
  }
  return null;
}

const monsterCLI = new Command();

monsterCLI
    .name('l10n')
    .version('0.1.0')
    .description('Continuous localization for the rest of us.')
;

monsterCLI
    .command('status [pipeline]')
    .description('translation status of content in a pipeline.')
    .action(async (pipelineArg) => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const pipeline = pipelineArg || 'default';
      console.log(`Status of pipeline ${pipeline}`);
      const status = await monsterManager.status(pipeline);
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
    .command('push [pipeline]')
    .description('push source content through a pipeline (send to translation).')
    .action(async (pipelineArg) => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const pipeline = pipelineArg || 'default';
      console.log(`Pushing content to pipeline ${pipeline}...`);
      const status = await monsterManager.push(pipeline);
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
    .command('grandfather [pipeline]')
    .description('grandfather existing translations in a pipeline.')
    .action(async (pipelineArg) => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const pipeline = pipelineArg || 'default';
      console.log(`Grandfathering content in pipeline ${pipeline}...`);
      const status = await monsterManager.grandfather(pipeline);
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

// TODO: it shouldn't have to be pipeline-specific
monsterCLI
    .command('pull [pipeline]')
    .description('receive outstanding translation jobs.')
    .action(async (pipelineArg) => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const pipeline = pipelineArg || 'default';
      console.log(`Pulling pending translations...`);
      const stats = await monsterManager.pull(pipeline);
      console.log(`Checked ${stats.numPendingJobs} pending jobs, ${stats.translatedStrings} translated strings pulled`);
      await monsterManager.shutdown();
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

monsterCLI
    .command('translate [pipeline]')
    .description('generate translated resources based on latest source and translations.')
    .action(async (pipelineArg) => {
    const monsterManager = await initMonster();
    if (monsterManager) {
      const pipeline = pipelineArg || 'default';
      console.log(`Generating translated resources from pipeline ${pipeline}...`);
      await monsterManager.translate(pipeline);
    } else {
      console.error('Unable to initialize. Do you have an l10nmonster.js file in your base directory?');
    }
  })
;

(async () => await monsterCLI.parseAsync(process.argv))();
