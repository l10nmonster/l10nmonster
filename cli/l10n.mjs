#!/usr/bin/env node

import runMonsterCLI from './index.js';
import { resolve, dirname, join } from 'path';
import { existsSync } from 'fs';

function findConfigFile(startDir = process.cwd()) {
    let currentDir = resolve(startDir);
    const configFileName = 'l10nmonster.config.mjs';
    
    while (true) {
        const configPath = join(currentDir, configFileName);
        if (existsSync(configPath)) {
            return configPath;
        }
        
        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            // We've reached the root directory
            break;
        }
        currentDir = parentDir;
    }
    
    return null;
}

try {
    const configPath = findConfigFile();
    if (!configPath) {
        console.error('Error: Could not find l10nmonster.config.mjs in current directory or any parent directory.');
        console.error('Please ensure the config file exists in your project root or current working directory.');
        process.exit(1);
    }
    
    const config = await import(configPath);
    await runMonsterCLI(config.default);
} catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('Error: Could not load l10nmonster.config.mjs - the file may have syntax errors or missing dependencies.');
        console.error('Details:', error.message);
    } else if (error.code === 'ENOENT') {
        console.error('Error: Config file was found but could not be accessed. Please check file permissions.');
        console.error('Details:', error.message);
    } else {
        console.error('Error running l10nmonster CLI:', error.message);
    }
    process.exit(1);
}
