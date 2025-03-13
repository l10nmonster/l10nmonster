import { inspect, styleText } from 'node:util';
import * as winston from 'winston';
import { OpsMgr } from './opsMgr.js';

const logLevels = ['error', 'warn', 'info', 'verbose'];
const levelColors = {
    error: 'red',
    warn: 'yellow',
    info: ['gray', 'bold', 'italic'],
    verbose: ['gray', 'dim', 'italic'],
}

function dealWithPlurals(x, styled = false) {
    if (Array.isArray(x)) {
        const formToUse = x[0] === 1 ? x[1] : x[2];
        return styled ? (styleText('green', formToUse)) : formToUse;
    }
    return styled ? styleText('red', String(x)) : String(x);
}

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.ms(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ms }) => {
            const time = String(timestamp).substring(11, 23);
            const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
            const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            return styleText(levelColors[level] ?? 'magenta', `${time} (${ms}) [${rss}MB/${heap}MB] ${level}: ${typeof message === 'string' ? dealWithPlurals(message) : inspect(message)}`);
        }),
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
        out.push(styleText('green', str));
        values.length > 0 && out.push(dealWithPlurals(values.shift(), true));
    });
    console.log(out.join(''));
};
