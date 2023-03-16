#!/usr/bin/env node

import * as path from 'path';
import { existsSync } from 'fs';
import { runMonsterCLI } from './src/cli.js';

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

const [ monsterConfigPath, extensionsPath ] = findConfig();
await runMonsterCLI(monsterConfigPath, extensionsPath);
