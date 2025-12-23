import path from 'path';
import { mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync, createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { getRegressionMode, logVerbose } from '../../l10nContext.js';

/**
 * @typedef {import('../../interfaces.js').FileStoreDelegate} FileStoreDelegate
 */

/**
 * File system store delegate for reading and writing files.
 * @implements {FileStoreDelegate}
 */
export class FsStoreDelegate {

    /** @type {string} */
    baseDir;

    /**
     * Creates a new FsStoreDelegate instance.
     * @param {string} baseDir - Base directory for file operations.
     */
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    toString() {
        return `FsStoreDelegate(baseDir=${this.baseDir})`;
    }

    /**
     * Lists all files in the base directory.
     * @returns {Promise<Array<[string, string]>>} Array of [filename, timestamp] tuples.
     */
    async listAllFiles() {
        const dirContents = readdirSync(this.baseDir, { recursive: true });

        /** @type {Array<[string, string]>} */
        const files = [];
        for (const filename of dirContents) {
            const stats = statSync(path.join(this.baseDir, /** @type {string} */ (filename)));
            if (stats.isFile()) {
                files.push([ /** @type {string} */ (filename), `TS${stats.mtimeMs}` ]);
            }
        }
        return files;
    }

    /**
     * Ensures the base directory exists.
     * @returns {Promise<string | undefined>} The created directory path or undefined.
     */
    async ensureBaseDirExists() {
        return mkdirSync(this.baseDir, { recursive: true });
    }

    /**
     * Gets file contents as a string.
     * @param {string} filename - File path relative to base directory.
     * @returns {Promise<string>} File contents.
     */
    async getFile(filename) {
        return readFileSync(path.join(this.baseDir, filename), 'utf8');
    }

    /**
     * Gets a readable stream for a file.
     * @param {string} filename - File path relative to base directory.
     * @returns {import('node:fs').ReadStream} Readable stream.
     */
    getStream(filename) {
        const pathName = path.join(this.baseDir, filename);
        const readable = createReadStream(pathName);
        return readable;
    }

    /**
     * Saves content to a file.
     * @param {string | string[]} filename - File path or path segments.
     * @param {string} contents - Content to write.
     * @returns {Promise<string>} Timestamp string for the saved file.
     */
    async saveFile(filename, contents) {
        Array.isArray(filename) && (filename = path.join(...filename));
        const dir = path.dirname(path.join(this.baseDir, filename));
        mkdirSync(dir, { recursive: true });
        const pathName = path.join(this.baseDir, filename);
        writeFileSync(pathName, contents, 'utf8');
        const stats = statSync(pathName);
        return getRegressionMode() ? 'TS1' : `TS${stats.mtimeMs}`;
    }

    /**
     * Saves a readable stream to a file.
     * @param {string | string[]} filename - File path or path segments.
     * @param {NodeJS.ReadableStream} readable - Readable stream to save.
     * @param {boolean} [deleteEmptyFiles=false] - Whether to delete if file is empty.
     * @returns {Promise<string | null>} Timestamp string or null if deleted.
     */
    async saveStream(filename, readable, deleteEmptyFiles = false) {
        Array.isArray(filename) && (filename = path.join(...filename));
        const dir = path.dirname(path.join(this.baseDir, filename));
        mkdirSync(dir, { recursive: true });
        const pathName = path.join(this.baseDir, filename);

        const writable = createWriteStream(pathName);
        await pipeline(readable, writable);
        logVerbose`FsStoreDelegate: ${writable.bytesWritten} bytes written to ${pathName}`;
        if (deleteEmptyFiles && writable.bytesWritten === 0) {
            logVerbose`FsStoreDelegate: deleting empty file ${pathName}`;
            unlinkSync(pathName);
            return null;
        }
        const stats = statSync(pathName);
        return getRegressionMode() ? 'TS1' : `TS${stats.mtimeMs}`;
    }

    /**
     * Deletes multiple files.
     * @param {string[]} filenames - Array of file paths to delete.
     * @returns {Promise<void>}
     */
    async deleteFiles(filenames) {
        for (const filename of filenames) {
            const pathName = path.join(this.baseDir, filename);
            try {
                logVerbose`Deleting file ${pathName}`;
                unlinkSync(pathName);
            } catch(e) {
                logVerbose`Error deleting file ${pathName}: ${e.message ?? e}`;
            }
        }
    }
}
