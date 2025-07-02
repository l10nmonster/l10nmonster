import { pipeline } from 'node:stream/promises';
import { Storage } from '@google-cloud/storage';
import { getRegressionMode } from '@l10nmonster/core';

export class GCSStoreDelegate {
    constructor(bucketName, bucketPrefix) {
        this.bucketName = bucketName;
        this.bucketPrefix = bucketPrefix;
        this.storage = new Storage();
    }

    toString() {
        return `GCSStoreDelegate(bucketName=${this.bucketName}, bucketPrefix=${this.bucketPrefix})`;
    }

    async listAllFiles() {
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const [ files ] = await this.bucket.getFiles({ prefix: this.bucketPrefix });
        const filenamesWithModified = files.map(f => [ f.name.replace(`${this.bucketPrefix}/`, ''), f.generation ]);
        return filenamesWithModified;
    }

    async ensureBaseDirExists() {
    }

    async getFile(filename) {
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const gcsContents = await this.bucket.file(`${this.bucketPrefix}/${filename}`).download();
        return gcsContents.toString();
    }

    async getStream(filename) {
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const gcsStream = await this.bucket.file(`${this.bucketPrefix}/${filename}`).createReadStream();
        return gcsStream;
    }

    async saveFile(filename, contents) {
        Array.isArray(filename) && (filename = filename.join('/'));
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
        await file.save(contents);
    }

    async saveStream(filename, readable) {
        Array.isArray(filename) && (filename = filename.join('/'));
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
        await pipeline(readable, file.createWriteStream());
        return getRegressionMode() ? 'TS1' : filename.generation;
    }

    async deleteFiles(filenames) {
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        for (const filename of filenames) {
            const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
            await file.delete();
        }
    }
}
