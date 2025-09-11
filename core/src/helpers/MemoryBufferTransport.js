import { inspect } from 'node:util';
import { writeFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import Transport from 'winston-transport';

class MemoryBufferTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.buffer = [];
        this.maxSize = opts.maxSize || 100000;
        // Define verbosity levels for filtering (matches l10nContext logLevels)
        this.verbosityLevels = ['error', 'warn', 'info', 'verbose'];
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
    getRecentLogs(maxSize, verbosity) {
        let logs = this.buffer;
        
        // Filter by verbosity level if specified
        if (verbosity !== undefined) {
            let maxVerbosityIndex;
            
            // Support both numeric verbosity (0-3) and string level names
            if (typeof verbosity === 'number') {
                maxVerbosityIndex = verbosity;
            } else {
                maxVerbosityIndex = this.verbosityLevels.indexOf(verbosity);
            }
            
            if (maxVerbosityIndex >= 0 && maxVerbosityIndex < this.verbosityLevels.length) {
                logs = this.buffer.filter(logEntry => {
                    const logLevelIndex = this.verbosityLevels.indexOf(logEntry.level);
                    return logLevelIndex !== -1 && logLevelIndex <= maxVerbosityIndex;
                });
            }
        }
        
        // Apply maxSize limit
        if (maxSize !== undefined) {
            logs = logs.slice(-maxSize);
        }
        
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

export default MemoryBufferTransport;
