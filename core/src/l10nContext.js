import { inspect } from 'node:util';
import * as winston from 'winston';
import { OpsMgr } from './opsMgr.js';

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const colorEscapes = {
    black: '\x1b[30m',
    gray: '\x1b[90m',
    underscore: '\x1b[4m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bright: '\x1b[1m',
};

const consoleColor = process.stdout.isTTY ? colorEscapes : Object.fromEntries(Object.keys(colorEscapes).map(k => [k, '']));

const logLevels = ['error', 'warn', 'info', 'verbose'];

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.ms(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ms }) => `${consoleColor.green}${timestamp.substr(11, 12)} (${ms}) [${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB] ${level}: ${typeof message === 'string' ? message : inspect(message)}${consoleColor.reset}`)
    ),
});

// This is a shared context across all components
export class L10nContext {
    static logger = winston.createLogger({
        level: 'warn',
        transports: [ consoleTransport ],
    });

    static setVerbosity = (level) => {
        consoleTransport.level = logLevels[level] ?? 'warn';
    };

    static env = process.env;
    static opsMgr = new OpsMgr();

    // these are set per "request" even though they are shared
    static baseDir = '.';
    static prj;
    static arg;
    static regression = false;
}
// logInfo`this is the error: ${message}`

export const consoleLog = (strings, ...values) => {
    const out = [];
    for (let i = 0; i < strings.length; i++) {
        out.push(`${consoleColor.black}${strings[i]}${consoleColor.reset}`);
        if (i < values.length) {
        out.push(`${consoleColor.bright}${values[i]}${consoleColor.reset}`);
        }
    }
    console.log(out.join(''));
};
