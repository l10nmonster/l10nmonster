import { inspect, styleText } from 'node:util';
import * as winston from 'winston';
import { OpsMgr } from './opsMgr.js';

const logLevels = ['error', 'warn', 'info', 'verbose'];

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.ms(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ms }) => styleText(['reset', 'dim'], `${String(timestamp).substring(11, 23)} (${ms}) [${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB] ${level}: ${typeof message === 'string' ? message : inspect(message)}`))
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
    strings.forEach(str => {
        out.push(styleText('magenta', str));
        values.length > 0 && out.push(styleText('magentaBright', String(values.shift())));
    });
    console.log(out.join(''));
};
