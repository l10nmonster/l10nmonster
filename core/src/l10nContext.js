import { inspect, styleText } from 'node:util';
import * as winston from 'winston';

const logLevels = ['error', 'warn', 'info', 'verbose'];
const levelColors = {
    error: 'red',
    warn: 'yellow',
    info: ['gray', 'bold', 'italic'],
    verbose: ['gray', 'dim', 'italic'],
};

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

const logger = winston.createLogger({
    level: 'warn',
    transports: [ consoleTransport ],
});

let verbosity = 1;
export const getVerbosity = () => verbosity;
export const setVerbosity = (level) => {
    verbosity = level ?? 1;
    consoleTransport.level = logLevels[level] ?? 'warn';
};

let regressionMode = false;
export const getRegressionMode = () => regressionMode;
export const setRegressionMode = (mode) => {
    regressionMode = Boolean(mode);
};

let baseDir = '.';
export const getBaseDir = () => baseDir;
export const setBaseDir = (dir) => {
    baseDir = dir;
};

function renderTaggedString(strings, values, styled = false) {
    const out = [];
    strings.forEach(str => {
        const styleFragment = styled && str[0] !== '\x1B';
        out.push(styleFragment ? styleText('green', str) : str);
        if (values.length > 0) {
            const value = values.shift();
            if (Array.isArray(value)) {
                const formToUse = value[0] === 1 ? value[1] : value[2];
                out.push(styleFragment ? styleText('green', String(formToUse)) : String(formToUse));
            } else {
                out.push(styleFragment ? styleText('red', String(value)) : String(value));
            }
        }
    });
    return out.join('');
};

export const logError = (strings, ...values) => {
    logger.error(renderTaggedString(strings, values, true));
};

export const logWarn = (strings, ...values) => {
    logger.warn(renderTaggedString(strings, values, true));
};

export const logInfo = (strings, ...values) => {
    logger.info(renderTaggedString(strings, values, false));
};

export const logVerbose = (strings, ...values) => {
    logger.verbose(renderTaggedString(strings, values, false));
};

export const consoleLog = (strings, ...values) => {
    console.log(renderTaggedString(strings, values, true));
};

export const styleString = (strings, ...values) => renderTaggedString(strings, values, true);
