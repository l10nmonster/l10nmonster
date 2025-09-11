import { inspect, styleText } from 'node:util';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import * as winston from 'winston';
import Transport from 'winston-transport';

const corePackage = JSON.parse(readFileSync(path.join(import.meta.dirname, '../package.json'), 'utf-8'));
export const corePackageVersion = corePackage.version;

const logLevels = ['error', 'warn', 'info', 'verbose'];
const levelColors = {
    error: 'red',
    warn: 'yellow',
    info: ['gray', 'bold', 'italic'],
    verbose: ['gray', 'dim', 'italic'],
};

class MemoryBufferTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.buffer = [];
        this.maxSize = opts.maxSize || 100000;
    }

    log(info, callback) {
        // Add new log to buffer with timestamp
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: info.level,
            message: info.message,
            ms: info.ms,
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            ...info
        };

        this.buffer.push(logEntry);

        // Remove oldest if buffer exceeds max size
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }

        callback();
    }

    // Helper method to format a log entry
    formatLogEntry(logEntry) {
        const time = String(logEntry.timestamp).substring(11, 23);
        const messageString = typeof logEntry.message === 'string' ? logEntry.message : inspect(logEntry.message);
        return `${time} (${logEntry.ms || 'N/A'}) [${logEntry.rss || 0}MB/${logEntry.heap || 0}MB] ${logEntry.level}: ${messageString}`;
    }

    // Method to retrieve recent logs
    getRecentLogs(maxSize) {
        const logs = maxSize === undefined ? [...this.buffer] : this.buffer.slice(-maxSize);
        return logs.map(logEntry => this.formatLogEntry(logEntry));
    }

    // Method to dump all logs to a temporary file
    dumpLogs() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `l10nmonster-logs-${timestamp}.txt`;
        const filepath = path.join(tmpdir(), filename);
        
        const formattedLogs = this.buffer.map(logEntry => this.formatLogEntry(logEntry));
        
        const logContent = [
            `L10n Monster Log Dump`,
            `Dumped at: ${new Date().toISOString()}`,
            `Total logs: ${this.buffer.length}`,
            `Max buffer size: ${this.maxSize}`,
            ``,
            ...formattedLogs
        ].join('\n');

        writeFileSync(filepath, logContent, 'utf-8');
        return filepath;
    }

    // Method to clear buffer
    clearBuffer() {
        this.buffer = [];
    }
}

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
export const getVerbosity = () => verbosity;
export const setVerbosity = (level) => {
    verbosity = level ?? 1;
    const consoleLevel = logLevels[level] ?? 'warn';
    consoleTransport.level = consoleLevel;
    // Update the main logger level to be the most verbose between console and memory
    // This ensures memory always gets verbose logs while console respects user setting
    logger.level = 'verbose';
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

// Memory buffer log methods
export const getRecentLogs = (maxSize) => memoryTransport.getRecentLogs(maxSize);
export const dumpLogs = () => memoryTransport.dumpLogs();
