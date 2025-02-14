/* eslint-disable no-underscore-dangle */

import { Command, Argument, InvalidArgumentError } from 'commander';

// eslint-disable-next-line no-unused-vars
function intOptionParser(value, _dummyPrevious) {
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
    // @ts-ignore
    help.options && help.options.forEach(opt => cmd.option(...opt));
    // @ts-ignore
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
        .version('2.0.0', '--version', 'output the current version number')
        .description('Continuous localization for the rest of us.')
        .option('-v, --verbose [level]', '0=error, 1=warning, 2=info, 3=verbose', intOptionParser)
        .option('-p, --prj <prj1,...>', 'limit source to specified projects')
        .option('--arg <string>', 'optional config constructor argument')
        .option('--regression', 'keep variables constant during regression testing');
    try {
        const l10nRunner = async (cb) => await monsterConfig.run(monsterCLI.opts(), async l10n => await cb(l10n));
        monsterConfig.actions.forEach(Action => {
            const cmd = monsterCLI.command(Action.name);
            if (Action.subActions) {
                cmd.description(Action.help.description)
                Action.subActions.forEach(subAction => {
                    const subName = subAction.name.split('_')[1];
                    const subCmd = cmd.command(subName);
                    configureCommand(subCmd, subAction, l10nRunner)
                });
            } else {
                configureCommand(cmd, Action, l10nRunner);
            }
            });
        const argv = typeof cliCommand === 'string' ? cliCommand.split(' ') : cliCommand;
        await monsterCLI.parseAsync(argv);
    } catch(e) {
        console.error(`Unable to run: ${e.stack || e}`);
        process.exit(1);
    }
}
