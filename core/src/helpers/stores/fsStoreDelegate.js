import path from 'path';
import { mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync, createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { L10nContext } from '@l10nmonster/core';

export class FsStoreDelegate {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    toString() {
        return `FsStoreDelegate(baseDir=${this.baseDir})`;
    }

    async listAllFiles() {
        const dirContents = readdirSync(this.baseDir, { recursive: true });
        return dirContents.map(filename => {
                const stats = statSync(path.join(this.baseDir, filename));
                return stats.isFile() ? [ filename, `TS${stats.mtimeMs}` ] : undefined;
            })
            .filter(f => f !== undefined);
    }

    async ensureBaseDirExists() {
        return mkdirSync(this.baseDir, { recursive: true });
    }

    async getFile(filename) {
        return readFileSync(path.join(this.baseDir, filename), 'utf8');
    }

    getStream(filename) {
        const pathName = path.join(this.baseDir, filename);
        const readable = createReadStream(pathName);
        return readable;
    }

    async saveFile(filename, contents) {
        Array.isArray(filename) && (filename = path.join(...filename));
        const dir = path.dirname(path.join(this.baseDir, filename));
        mkdirSync(dir, { recursive: true });
        const pathName = path.join(this.baseDir, filename);
        writeFileSync(pathName, contents, 'utf8');
        const stats = statSync(pathName);
        return L10nContext.regression ? 'TS1' : `TS${stats.mtimeMs}`;
    }

    async saveStream(filename, readable) {
        Array.isArray(filename) && (filename = path.join(...filename));
        const dir = path.dirname(path.join(this.baseDir, filename));
        mkdirSync(dir, { recursive: true });
        const pathName = path.join(this.baseDir, filename);

        const writable = createWriteStream(pathName);
        await pipeline(readable, writable);
        const stats = statSync(pathName);
        return L10nContext.regression ? 'TS1' : `TS${stats.mtimeMs}`;
    }

    async deleteFiles(filenames) {
        for (const filename of filenames) {
            try {
                unlinkSync(path.join(this.baseDir, filename));
            // eslint-disable-next-line no-unused-vars
            } catch(e) {
                // L10nContext.logger.info(e.message ?? e);
            }
        }
    }
}
