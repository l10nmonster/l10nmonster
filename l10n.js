#!/usr/bin/env node

/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-invalid-this */

import * as path from 'path';
import {
  existsSync,
} from 'fs';
import { Command, Argument, InvalidArgumentError } from 'commander';
import { createMonsterManager } from './src/defaultMonster.js';
import * as cli from './src/l10nCommands.js';

function findConfig() {
    let baseDir = path.resolve('.'),
        previousDir = null;
    while (baseDir !== previousDir) {
        const configPath = path.join(baseDir, 'l10nmonster.mjs');
        if (existsSync(configPath)) {
            const cliExtensions = path.join(baseDir, 'l10nmonster-cli.mjs');
            return [ configPath, existsSync(cliExtensions) && cliExtensions ];
        }
        previousDir = baseDir;
        baseDir = path.resolve(baseDir, '..');
    }
    return [];
}

// eslint-disable-next-line no-unused-vars
function intOptionParser(value, _dummyPrevious) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not an integer');
  }
  return parsedValue;
}

function createMonsterCLI(cliCtx, preAction) {
    const monsterCLI = new Command();
    monsterCLI
        .name('l10n')
        .version('0.1.0', '--version', 'output the current version number')
        .description('Continuous localization for the rest of us.')
        .option('-v, --verbose [level]', '0=error, 1=warning, 2=info, 3=verbose', intOptionParser)
        .option('-p, --prj <prj1,...>', 'limit source to specified projects')
        .option('--arg <string>', 'optional config constructor argument')
        .option('--cfg <filename.mjs>', 'specify the configuration file to use')
        .option('--regression', 'keep variables constant during regression testing');
    preAction && monsterCLI.hook('preAction', preAction);
    monsterCLI.command('status')
        .description('Translation status of content.')
        .option('-l, --lang <language>', 'only get status of target language')
        .option('-a, --all', 'show information for all projects, not just untranslated ones')
        .option('--output <filename>', 'write status to the specified file')
        .action(async function status() {
            await cli.status(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('jobs')
        .description('Unfinished jobs status.')
        .option('-l, --lang <language>', 'only get jobs for the target language')
        .action(async function jobs() {
            await cli.jobs(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('analyze')
        .description('Content reports and validation.')
        .argument('[analyzer]', 'name of the analyzer to run')
        .argument('[params...]', 'optional parameters to the analyzer')
        .option('-l, --lang <language>', 'target language to analyze (if TM analyzer)')
        .option('--filter <filter>', 'use the specified tu filter')
        .option('--output <filename>', 'filename to write the analysis to)')
        .action(async function analyze(analyzer, params) {
            await cli.analyze(cliCtx.monsterManager, { ...this.optsWithGlobals(), analyzer, params });
        });
    monsterCLI.command('push')
        .description('Push source content upstream (send to translation).')
        .option('-l, --lang <language>', 'target language to push')
        .option('--filter <filter>', 'use the specified tu filter')
        .option('--driver <untranslated|source|tm|job:jobGuid>', 'driver of translations need to be pushed (default: untranslated)')
        .option('--leverage', 'eliminate internal repetitions from untranslated driver')
        .option('--refresh', 'refresh existing translations without requesting new ones')
        .option('--provider <name,...>', 'use the specified translation providers')
        .option('--instructions <instructions>', 'send the specified translation instructions')
        .option('--dryrun', 'simulate translating and compare with existing translations')
        .action(async function push() {
            await cli.push(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('job')
        .description('Show request/response/pairs of a job or push/delete jobs.')
        .addArgument(new Argument('<operation>', 'operation to perform on job').choices(['req', 'res', 'pairs', 'push', 'delete']))
        .requiredOption('-g, --jobGuid <guid>', 'guid of job')
        .action(async function job(operation) {
            await cli.job(cliCtx.monsterManager, { ...this.optsWithGlobals(), operation });
        });
    monsterCLI.command('pull')
        .description('Receive outstanding translation jobs.')
        .option('--partial', 'commit partial deliveries')
        .option('-l, --lang <language>', 'only get jobs for the target language')
        .action(async function pull() {
            await cli.pull(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('snap')
        .description('Commits a snapshot of sources in normalized format.')
        .action(async function snap() {
            await cli.snap(cliCtx.monsterManager);
        });
    monsterCLI.command('translate')
        .description('Generate translated resources based on latest source and translations.')
        .option('-l, --lang <language>', 'target language to translate')
        .option('-d, --dryrun', 'simulate translating and compare with existing translations')
        .action(async function translate() {
            await cli.translate(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('tmexport')
        .description('Export translation memory in various formats.')
        .addArgument(new Argument('<mode>', 'export source (including untranslated) or tm entries (including missing in source)').choices(['source', 'tm']))
        .addArgument(new Argument('<format>', 'exported file format').choices(['tmx', 'json', 'job']))
        .option('-l, --lang <language>', 'target language to export')
        .option('--prjsplit', 'split target files by project')
        .action(async function tmexport(mode, format) {
            await cli.tmexport(cliCtx.monsterManager, { ...this.optsWithGlobals(), mode, format });
        });
    monsterCLI.command('monster')
        .description('Just because...')
        .action(async function monster() {
            await cli.monster(cliCtx.monsterManager, this.optsWithGlobals());
        });
    cliCtx.setupExtensions && cliCtx.setupExtensions(monsterCLI, cliCtx);
    return monsterCLI;
}

const [ monsterConfig, monsterCLI ] = findConfig();
const cliCtx = {};
const cliExtensions = monsterCLI || (process.env.l10nmonster_cliextensions && path.resolve('.', process.env.l10nmonster_cliextensions));
if (cliExtensions) {
    try {
        const extensionsModule = await import(cliExtensions);
        if (extensionsModule.setupExtensions) {
            cliCtx.setupExtensions = extensionsModule.setupExtensions;
        } else {
            console.log('Found extensions but no setupExtensions export found');
        }
    } catch(e) {
        console.log(`Couldn't load extensions from ${cliExtensions}: ${e.stack || e}`);
    }
}

try {
    await createMonsterCLI(
        cliCtx,
        async cli => {
            const options = cli.opts();
            const configPath = (options.cfg && path.resolve('.', options.cfg)) ?? monsterConfig;
            await createMonsterManager(
                configPath,
                options,
                async mm => cliCtx.monsterManager = mm
            );
        }
    ).parseAsync();
} catch(e) {
    console.error(`Unable to run: ${e.stack || e}`);
    process.exit(1);
} finally {
    cliCtx.monsterManager && (await cliCtx.monsterManager.shutdown());
}
