import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Storage } from '@google-cloud/storage';
import { L10nContext } from '@l10nmonster/core';

export class GCSStoreDelegate {
    constructor(bucketName, bucketPrefix) {
        this.bucketName = bucketName;
        this.bucketPrefix = bucketPrefix;
        this.storage = new Storage();
    }

    async listAllFiles() {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const [ files ] = await this.bucket.getFiles({ prefix: this.bucketPrefix });
            const filenamesWithModified = files.map(f => [ f.name.replace(`${this.bucketPrefix}/`, ''), f.generation ]);
            return filenamesWithModified;
        } catch(e) {
            L10nContext.logger.error(e.stack ?? e);
        }
    }

    async ensureBaseDirExists() {
    }

    async getFile(filename) {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const gcsContents = await this.bucket.file(`${this.bucketPrefix}/${filename}`).download();
            return gcsContents.toString();
        } catch(e) {
            L10nContext.logger.error(e.stack ?? e);
        }
    }

    async getStream(filename) {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const gcsStream = await this.bucket.file(`${this.bucketPrefix}/${filename}`).createReadStream();
            return gcsStream;
        } catch(e) {
            L10nContext.logger.error(e.stack ?? e);
        }
    }

    async saveFile(filename, contents) {
        try {
            Array.isArray(filename) && (filename = filename.join('/'));
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
            await file.save(contents);
        } catch(e) {
            L10nContext.logger.error(e.stack ?? e);
        }
    }

    async saveStream(filename, generator) {
        try {
            Array.isArray(filename) && (filename = filename.join('/'));
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const readable = Readable.from(generator());
            const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
            await pipeline(readable, file.createWriteStream());
            return L10nContext.regression ? 'TS1' : filename.generation;
        } catch(e) {
            L10nContext.logger.error(e.stack ?? e);
        }
    }

    async deleteFiles(filenames) {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            for (const filename of filenames) {
                const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
                await file.delete();
            }
        } catch(e) {
            L10nContext.logger.error(e.stack ?? e);
        }
    }
}
