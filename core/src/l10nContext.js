import { inspect, styleText } from 'node:util';
import * as winston from 'winston';

const logLevels = ['error', 'warn', 'info', 'verbose'];
const levelColors = {
    error: 'red',
    warn: 'yellow',
    info: ['gray', 'bold', 'italic'],
    verbose: ['gray', 'dim', 'italic'],
}

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.ms(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ms }) => {
            const time = String(timestamp).substring(11, 23);
            const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
            const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            const messageString = typeof message === 'string' ? message : inspect(message);
            return styleText(levelColors[level] ?? 'magenta', `${time} (${ms}) [${rss}MB/${heap}MB] ${level}: ${messageString}`);
        }),
    ),
});

class GlobalContext {
    logger;
    verbosity;

    // these are set per "request" even though they are shared
    baseDir = '.';
    regression = false;

    constructor() {
        this.verbosity = 1;
        this.logger = winston.createLogger({
            level: 'warn',
            transports: [ consoleTransport ],
        });
    }

    setVerbosity(level) {
        this.verbosity = level ?? 1;
        consoleTransport.level = logLevels[level] ?? 'warn';
    }
}

// This is a shared context across all components
export const L10nContext = new GlobalContext();

function renderTaggedString(strings, values, styled = false) {
    const out = [];
    strings.forEach(str => {
        out.push(styled ? styleText('green', str) : str);
        if (values.length > 0) {
            const value = values.shift();
            if (Array.isArray(value)) {
                const formToUse = value[0] === 1 ? value[1] : value[2];
                out.push(styled ? styleText('green', formToUse) : formToUse);
            } else {
                out.push(styled ? styleText('red', String(value)) : String(value));
            }
        }
    });
    return out.join('');
};

export const logError = (strings, ...values) => {
    L10nContext.logger.error(renderTaggedString(strings, values, true));
};

export const logWarn = (strings, ...values) => {
    L10nContext.logger.warn(renderTaggedString(strings, values, true));
};

export const logInfo = (strings, ...values) => {
    L10nContext.logger.info(renderTaggedString(strings, values, false));
};

export const logVerbose = (strings, ...values) => {
    L10nContext.logger.verbose(renderTaggedString(strings, values, false));
};

export const consoleLog = (strings, ...values) => {
    console.log(renderTaggedString(strings, values, true));
};
