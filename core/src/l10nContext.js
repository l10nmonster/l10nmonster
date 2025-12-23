import { inspect, styleText } from 'node:util';
import * as winston from 'winston';
import MemoryBufferTransport from './helpers/MemoryBufferTransport.js';
import { l10nMonsterVersion } from './version.js';

export const corePackageVersion = l10nMonsterVersion;

const logLevels = ['error', 'warn', 'info', 'verbose'];
const levelColors = {
    error: 'red',
    warn: 'yellow',
    info: ['gray', 'bold', 'italic'],
    verbose: ['gray', 'dim', 'italic'],
};


const consoleTransport = new winston.transports.Console({
    level: 'warn',  // Initial console level
    format: winston.format.printf(({ level, message, timestamp, ms }) => {
        const time = String(timestamp).substring(11, 23);
        const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
        const heap = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const messageString = typeof message === 'string' ? message : inspect(message);
        return styleText(levelColors[level] ?? 'magenta', `${time} (${ms}) [${rss}MB/${heap}MB] ${level}: ${messageString}`);
    }),
});

const memoryTransport = new MemoryBufferTransport({ 
    maxSize: 100000,
    level: 'verbose'  // Always capture at verbose level
});

const logger = winston.createLogger({
    level: 'verbose',  // Logger level set to capture all logs
    format: winston.format.combine(
        winston.format.ms(),
        winston.format.timestamp()
    ),
    transports: [ consoleTransport, memoryTransport ],
});

let verbosity = 1;

/** @returns {number} The current verbosity level. */
export const getVerbosity = () => verbosity;

/**
 * Sets the verbosity level.
 * @param {number} level - The verbosity level (0=error, 1=warn, 2=info, 3=verbose).
 */
export const setVerbosity = (level) => {
    verbosity = level ?? 1;
    const consoleLevel = logLevels[level] ?? 'warn';
    consoleTransport.level = consoleLevel;
    // Update the main logger level to be the most verbose between console and memory
    // This ensures memory always gets verbose logs while console respects user setting
    logger.level = 'verbose';
};

let regressionMode = false;

/** @returns {boolean} Whether regression mode is enabled. */
export const getRegressionMode = () => regressionMode;

/**
 * Sets the regression mode.
 * @param {boolean} mode - Whether to enable regression mode.
 */
export const setRegressionMode = (mode) => {
    regressionMode = Boolean(mode);
};

let baseDir = '.';

/** @returns {string} The base directory. */
export const getBaseDir = () => baseDir;

/**
 * Sets the base directory.
 * @param {string} dir - The base directory path.
 */
export const setBaseDir = (dir) => {
    baseDir = dir;
};

/**
 * Renders a tagged template string with optional styling.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {unknown[]} values - Template literal values.
 * @param {boolean} [styled=false] - Whether to apply styling.
 * @returns {string} The rendered string.
 */
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

/**
 * Logs an error message using tagged template literal.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {...unknown} values - Template literal values.
 */
export const logError = (strings, ...values) => {
    logger.error(renderTaggedString(strings, values, true));
};

/**
 * Logs a warning message using tagged template literal.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {...unknown} values - Template literal values.
 */
export const logWarn = (strings, ...values) => {
    logger.warn(renderTaggedString(strings, values, true));
};

/**
 * Logs an info message using tagged template literal.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {...unknown} values - Template literal values.
 */
export const logInfo = (strings, ...values) => {
    logger.info(renderTaggedString(strings, values, false));
};

/**
 * Logs a verbose message using tagged template literal.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {...unknown} values - Template literal values.
 */
export const logVerbose = (strings, ...values) => {
    logger.verbose(renderTaggedString(strings, values, false));
};

/**
 * Logs to console using tagged template literal.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {...unknown} values - Template literal values.
 */
export const consoleLog = (strings, ...values) => {
    console.log(renderTaggedString(strings, values, true));
};

/**
 * Creates a styled string using tagged template literal.
 * @param {TemplateStringsArray} strings - Template literal strings.
 * @param {...unknown} values - Template literal values.
 * @returns {string} The styled string.
 */
export const styleString = (strings, ...values) => renderTaggedString(strings, values, true);

// Memory buffer log methods
export const getRecentLogs = (maxSize, verbosity) => memoryTransport.getRecentLogs(maxSize, verbosity);
export const dumpLogs = () => memoryTransport.dumpLogs();
