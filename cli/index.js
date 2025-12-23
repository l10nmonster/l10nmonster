/* eslint-disable no-underscore-dangle */

import { Command, Argument, Option, InvalidArgumentError } from 'commander';
import { existsSync } from 'fs';
import path from 'path';
import { l10nMonsterVersion } from '@l10nmonster/core';

/**
 * Find l10nmonster.config.mjs by walking up the directory tree.
 * @param {string} [startDir] - Directory to start searching from (defaults to cwd)
 * @returns {string|null} - Path to config file or null if not found
 */
export function findConfigFile(startDir = process.cwd()) {
    let currentDir = path.resolve(startDir);
    const configFileName = 'l10nmonster.config.mjs';

    while (true) {
        const configPath = path.join(currentDir, configFileName);
        if (existsSync(configPath)) {
            return configPath;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    return null;
}

/**
 * Run the CLI with automatic config discovery.
 * @param {Object} [options] - Options for running the CLI
 * @param {Array} [options.extraActions] - Additional actions to register
 * @returns {Promise<void>}
 */
export async function runCLI({ extraActions = [] } = {}) {
    // Global unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Promise Rejection detected:');
        console.error('Promise:', promise);
        console.error('Reason:', reason);
        if (reason instanceof Error && reason.stack) {
            console.error('Stack trace:', reason.stack);
        }
        console.error('Exiting due to unhandled promise rejection...');
        process.exit(1);
    });

    // Global uncaught exception handler
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    });

    // Handle --help and --version before requiring config
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h') || args.includes('--version')) {
        const helpCLI = new Command();
        helpCLI
            .name('l10n')
            .version(l10nMonsterVersion, '--version', 'output the current version number')
            .description('Continuous localization for the rest of us.\n\nRun from a directory containing l10nmonster.config.mjs to see available commands.');
        helpCLI.parse();
        return;
    }

    try {
        const configPath = findConfigFile();
        if (!configPath) {
            console.error('Error: Could not find l10nmonster.config.mjs in current directory or any parent directory.');
            console.error('Please ensure the config file exists in your project root or current working directory.');
            process.exit(1);
        }

        const config = await import(configPath);
        let monsterConfig = config.default;

        // Add any extra actions
        for (const action of extraActions) {
            monsterConfig = monsterConfig.action(action);
        }

        // eslint-disable-next-line no-use-before-define
        await runMonsterCLI(monsterConfig);
    } catch (error) {
        console.error('Error running l10nmonster CLI:');
        console.error(error.stack || error);
        process.exit(1);
    }
}

function intOptionParser(value) {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      throw new InvalidArgumentError('Not an integer');
    }
    return parsedValue;
}

function configureCommand(cmd, Action, l10nRunner) {

    /** @this Command */
    const actionHandler = async function actionHandler() {
        const options = this.opts();
        // Need to hack into the guts of commander as it doesn't seem to expose argument names
        // @ts-ignore
        const args = Object.fromEntries(this._args.map((arg, idx) => [
            arg._name,
            arg.variadic ? this.args.slice(idx) : this.args[idx]
        ]));
        await l10nRunner(async l10n => {
            await l10n[Action.name]({ ...options, ...args })
        });
    };
    const help = Action.help;
    cmd.description(help.description).action(actionHandler);
    help.summary && cmd.summary(help.summary);
    help.options && help.options.forEach(([ arg, desc, choices]) => {
        if (choices) {
            cmd.addOption(new Option(arg, desc).choices(choices));
        } else {
            cmd.option(arg, desc);
        }
    });
    help.requiredOptions && help.requiredOptions.forEach(opt => cmd.requiredOption(...opt));
    help.arguments && help.arguments.forEach(([ arg, desc, choices]) => {
        if (choices) {
            cmd.addArgument(new Argument(arg, desc).choices(choices));
        } else {
            cmd.argument(arg, desc);
        }
    });
}

/** @type {import('./interfaces.js').RunMonsterCLI} */
export default async function runMonsterCLI(monsterConfig, cliCommand) {
    const monsterCLI = new Command();
    monsterCLI
        .name('l10n')
        .version(l10nMonsterVersion, '--version', 'output the current version number')
        .description('Continuous localization for the rest of us.')
        .option('-v, --verbose [level]', '0=error, 1=warning, 2=info, 3=verbose', intOptionParser)
        .option('--regression', 'keep variables constant during regression testing');
    try {
        const l10nRunner = async (cb) => {
            const { verbose, regression } = monsterCLI.opts();
            await monsterConfig
                .verbose(verbose)
                .regression(regression)
                .run(async mm => await cb(mm.l10n));
        };
        monsterConfig.actions.forEach(Action => {
            const cmd = monsterCLI.command(Action.name);
            if (Action.subActions) {
                Action.help.description && cmd.description(Action.help.description);
                Action.subActions.forEach(subAction => {
                    const subName = subAction.name.split('_')[1];
                    const subCmd = cmd.command(subName);
                    configureCommand(subCmd, subAction, l10nRunner);
                });
            } else {
                configureCommand(cmd, Action, l10nRunner);
            }
        });
        const argv = typeof cliCommand === 'string' ? cliCommand.split(' ') : cliCommand;
        await monsterCLI.parseAsync(argv);
    } catch(e) {
        console.error(`Unable to run the CLI: ${e.message ?? e}`);
        process.exit(1);
    }
}
