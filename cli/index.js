/* eslint-disable no-underscore-dangle */

import { Command, Argument, Option, InvalidArgumentError } from 'commander';
import { getVerbosity } from '@l10nmonster/core';

import path from 'path';
import { readFileSync } from 'fs';
const cliVersion = JSON.parse(readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf-8')).version;

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

export default async function runMonsterCLI(monsterConfig, cliCommand) {
    const monsterCLI = new Command();
    monsterCLI
        .name('l10n')
        .version(cliVersion, '--version', 'output the current version number')
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
        console.error(`Unable to run CLI: ${(getVerbosity() > 1 ? e.stack : e.message) || e}`);
        process.exit(1);
    }
}
