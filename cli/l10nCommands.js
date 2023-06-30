/* eslint-disable no-negated-condition */
import * as path from 'path';
import * as util from 'node:util';
import * as winston from 'winston';

import { createMonsterManager } from '@l10nmonster/core';

import { analyze } from './analyze.js';
import { job } from './job.js';
import { jobs } from './jobs.js';
import { monster } from './monster.js';
import { pull } from './pull.js';
import { push } from './push.js';
import { snap } from './snap.js';
import { status } from './status.js';
import { tmexport } from './tmexport.js';
import { translate } from './translate.js';
import { consoleColor } from './shared.js';

function createLogger(verboseOption) {
    // eslint-disable-next-line no-nested-ternary
    const verboseLevel = (verboseOption === undefined || verboseOption === 0) ?
        'error' :
    // eslint-disable-next-line no-nested-ternary
        ((verboseOption === 1) ?
            'warn' :
            ((verboseOption === true || verboseOption === 2) ? 'info' : 'verbose'));
    return winston.createLogger({
        level: verboseLevel,
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.ms(),
                    winston.format.timestamp(),
                    winston.format.printf(({ level, message, timestamp, ms }) => `${consoleColor.green}${timestamp.substr(11, 12)} (${ms}) [${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB] ${level}: ${typeof message === 'string' ? message : util.inspect(message)}${consoleColor.reset}`)
                ),
            }),
        ],
    });
}

function createHandler(mm, globalOptions, action) {
    return opts => action(mm, { ...globalOptions, ...opts});
}

export const builtInCmds = [ analyze, job, jobs, monster, pull, push, snap, status, tmexport, translate ];

export async function runL10nMonster(relativePath, globalOptions, cb) {
    const configPath = path.resolve('.', relativePath);
    global.l10nmonster ??= {};
    l10nmonster.logger = createLogger(globalOptions.verbose);
    l10nmonster.env = process.env;
    const mm = await createMonsterManager(configPath, globalOptions);
    const l10n = {
        withMonsterManager: (cb) => cb(mm),
    };
    [ ...builtInCmds, ...mm.extensionCmds ]
        .forEach(Cmd => l10n[Cmd.name] = createHandler(mm, globalOptions, Cmd.action));
    let response;
    try {
        response = await cb(l10n);
    } catch(e) {
        response = { error: e.stack ?? e };
    } finally {
        mm && (await mm.shutdown());
    }
    if (response?.error) {
        throw response.error;
    }
    return response;
}
