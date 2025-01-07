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

        /** @this Command */
        const actionHandler = async function actionHandler() {
            const options = this.opts();
            // Need to hack into the guts of commander as it doesn't seem to expose argument names
            const args = Object.fromEntries(this._args.map((arg, idx) => [
                arg._name,
                arg.variadic ? this.args.slice(idx) : this.args[idx]
            ]));
            await monsterConfig.run(monsterCLI.opts(), async l10n => {
                await l10n[this.name()]({ ...options, ...args });
            });
        };
        monsterConfig.actions.forEach(Action => {
            const help = Action.help;
            const cmd = monsterCLI.command(Action.name)
                .description(help.description)
                .action(actionHandler);
            help.options && help.options.forEach(opt => cmd.option(...opt));
            help.requiredOptions && help.requiredOptions.forEach(opt => cmd.requiredOption(...opt));
            help.arguments && help.arguments.forEach(([ arg, desc, choices]) => {
                if (choices) {
                    cmd.addArgument(new Argument(arg, desc).choices(choices));
                } else {
                    cmd.argument(arg, desc);
                }
            });
            });
        const argv = typeof cliCommand === 'string' ? cliCommand.split(' ') : cliCommand;
        await monsterCLI.parseAsync(argv);
    } catch(e) {
        console.error(`Unable to run: ${e.stack || e}`);
        process.exit(1);
    }
}
