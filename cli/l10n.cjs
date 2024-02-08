#!/usr/bin/env node
/* eslint-disable no-underscore-dangle */

const path = require('path');
const { existsSync } = require('fs');
const { Command, Argument, InvalidArgumentError } = require('commander');
const { builtInCmds, runL10nMonster } = require('./out/l10nCommands.cjs');

/* eslint-disable no-invalid-this */

// eslint-disable-next-line no-unused-vars
function intOptionParser(value, _dummyPrevious) {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
      throw new InvalidArgumentError('Not an integer');
    }
    return parsedValue;
  }

async function runMonsterCLI(monsterConfigPath) {
    const monsterCLI = new Command();
    monsterCLI
        .name('l10n')
        .version('0.1.0', '--version', 'output the current version number')
        .description('Continuous localization for the rest of us.')
        .option('-v, --verbose [level]', '0=error, 1=warning, 2=info, 3=verbose', intOptionParser)
        .option('-p, --prj <prj1,...>', 'limit source to specified projects')
        .option('--arg <string>', 'optional config constructor argument')
        .option('--regression', 'keep variables constant during regression testing');
    try {
        const actionHandler = async function actionHandler() {
            const options = this.opts();
            // Need to hack into the guts of commander as it doesn't seem to expose argument names
            const args = Object.fromEntries(this._args.map((arg, idx) => [
                arg._name,
                arg.variadic ? this.args.slice(idx) : this.args[idx]
            ]));
            await runL10nMonster(monsterConfigPath, monsterCLI.opts(), async l10n => {
                await l10n[this.name()]({ ...options, ...args });
            });
        };
        const Config = require(monsterConfigPath);
        [ ...builtInCmds, ...(Config.extensionCmds ?? []) ]
            .forEach(Cmd => {
                const help = Cmd.help;
                const cmd = monsterCLI.command(Cmd.name)
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
        await monsterCLI.parseAsync();
    } catch(e) {
        console.error(`Unable to run: ${e.stack || e}`);
        process.exit(1);
    }
}

function findConfig() {
    let baseDir = path.resolve('.'),
        previousDir = null;
    while (baseDir !== previousDir) {
        const configPath = path.join(baseDir, 'l10nmonster.cjs');
        if (existsSync(configPath)) {
            return configPath;
        }
        previousDir = baseDir;
        baseDir = path.resolve(baseDir, '..');
    }
    return [];
}

(async () => {
    await runMonsterCLI(findConfig());
})();
