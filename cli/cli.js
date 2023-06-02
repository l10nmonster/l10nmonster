import * as path from 'path';
import { Command, Argument, InvalidArgumentError } from 'commander';
import { createMonsterManager } from '@l10nmonster/core';
import * as l10n from './l10nCommands.js';

/* eslint-disable no-invalid-this */
/* eslint-disable prefer-arrow-callback */

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
        .option('--cfg <filename.cjs>', 'specify the configuration file to use')
        .option('--regression', 'keep variables constant during regression testing');
    preAction && monsterCLI.hook('preAction', preAction);
    monsterCLI.command('status')
        .description('translation status of content.')
        .option('-l, --lang <language>', 'only get status of target language')
        .option('-a, --all', 'show information for all projects, not just untranslated ones')
        .option('--output <filename>', 'write status to the specified file')
        .action(async function status() {
            await l10n.status(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('jobs')
        .description('unfinished jobs status.')
        .option('-l, --lang <language>', 'only get jobs for the target language')
        .action(async function jobs() {
            await l10n.jobs(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('analyze')
        .description('content reports and validation.')
        .argument('[analyzer]', 'name of the analyzer to run')
        .argument('[params...]', 'optional parameters to the analyzer')
        .option('-l, --lang <language>', 'target language to analyze (if TM analyzer)')
        .option('--filter <filter>', 'use the specified tu filter')
        .option('--output <filename>', 'filename to write the analysis to)')
        .action(async function analyze(analyzer, params) {
            await l10n.analyze(cliCtx.monsterManager, { ...this.optsWithGlobals(), analyzer, params });
        });
    monsterCLI.command('push')
        .description('push source content upstream (send to translation).')
        .option('-l, --lang <language>', 'target language to push')
        .option('--filter <filter>', 'use the specified tu filter')
        .option('--driver <untranslated|source|tm|job:jobGuid>', 'driver of translations need to be pushed (default: untranslated)')
        .option('--leverage', 'eliminate internal repetitions from untranslated driver')
        .option('--refresh', 'refresh existing translations without requesting new ones')
        .option('--provider <name,...>', 'use the specified translation providers')
        .option('--instructions <instructions>', 'send the specified translation instructions')
        .option('--dryrun', 'simulate translating and compare with existing translations')
        .action(async function push() {
            await l10n.push(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('job')
        .description('show request/response/pairs of a job or push/delete jobs.')
        .addArgument(new Argument('<operation>', 'operation to perform on job').choices(['req', 'res', 'pairs', 'push', 'delete']))
        .requiredOption('-g, --jobGuid <guid>', 'guid of job')
        .action(async function job(operation) {
            await l10n.job(cliCtx.monsterManager, { ...this.optsWithGlobals(), operation });
        });
    monsterCLI.command('pull')
        .description('receive outstanding translation jobs.')
        .option('--partial', 'commit partial deliveries')
        .option('-l, --lang <language>', 'only get jobs for the target language')
        .action(async function pull() {
            await l10n.pull(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('snap')
        .description('commits a snapshot of sources in normalized format.')
        .option('--maxSegments <number>', 'threshold to break up snapshots into chunks')
        .action(async function snap() {
            await l10n.snap(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('translate')
        .description('generate translated resources based on latest source and translations.')
        .option('-l, --lang <language>', 'target language to translate')
        .option('-d, --dryrun', 'simulate translating and compare with existing translations')
        .action(async function translate() {
            await l10n.translate(cliCtx.monsterManager, this.optsWithGlobals());
        });
    monsterCLI.command('tmexport')
        .description('export translation memory in various formats.')
        .addArgument(new Argument('<mode>', 'export source (including untranslated) or tm entries (including missing in source)').choices(['source', 'tm']))
        .addArgument(new Argument('<format>', 'exported file format').choices(['tmx', 'json', 'job']))
        .option('-l, --lang <language>', 'target language to export')
        .option('--prjsplit', 'split target files by project')
        .action(async function tmexport(mode, format) {
            await l10n.tmexport(cliCtx.monsterManager, { ...this.optsWithGlobals(), mode, format });
        });
    monsterCLI.command('monster')
        .description('just because...')
        .action(async function monster() {
            await l10n.monster(cliCtx.monsterManager, this.optsWithGlobals());
        });
    cliCtx.setupExtensions && cliCtx.setupExtensions(monsterCLI, cliCtx);
    return monsterCLI;
}

export async function runMonsterCLI(monsterConfigPath, extensionsPath) {
    const cliCtx = {};
    const cliExtensions = extensionsPath || (process.env.l10nmonster_cliextensions && path.resolve('.', process.env.l10nmonster_cliextensions));
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
                const configPath = (options.cfg && path.resolve('.', options.cfg)) ?? monsterConfigPath;
                const logger = l10n.createLogger(options.verbose);
                const mm = await createMonsterManager({
                    configPath,
                    options,
                    logger,
                    env: process.env,
                });
                cliCtx.monsterManager = mm;
            }
        ).parseAsync();
    } catch(e) {
        console.error(`Unable to run: ${e.stack || e}`);
        process.exit(1);
    } finally {
        cliCtx.monsterManager && (await cliCtx.monsterManager.shutdown());
    }
}
