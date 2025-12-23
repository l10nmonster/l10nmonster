import { pipeline } from 'node:stream/promises';
import { Storage } from '@google-cloud/storage';
import { getRegressionMode, logVerbose } from '@l10nmonster/core';

export class GCSStoreDelegate {
    constructor(bucketName, bucketPrefix) {
        this.bucketName = bucketName;
        this.bucketPrefix = bucketPrefix;
        this.storage = new Storage();
    }

    toString() {
        return `GCSStoreDelegate(bucketName=${this.bucketName}, bucketPrefix=${this.bucketPrefix})`;
    }

    /**
     * @returns {Promise<Array<[string, string]>>}
     */
    async listAllFiles() {
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const prefix = this.bucketPrefix === '' ?
            '' :
            (this.bucketPrefix.endsWith('/') ? this.bucketPrefix : `${this.bucketPrefix}/`);
        const [ files ] = await this.bucket.getFiles({ prefix });

        /** @type {Array<[string, string]>} */
        const filenamesWithModified = files.map(f => [ f.name.replace(prefix, ''), String(f.generation) ]);
        return filenamesWithModified;
    }

    async ensureBaseDirExists() {
        return undefined;
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
        const [metadata] = await file.getMetadata();
        return getRegressionMode() ? 'TS1' : String(metadata.generation);
    }

    async saveStream(filename, readable, deleteEmptyFiles = false) {
        Array.isArray(filename) && (filename = filename.join('/'));
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
        await pipeline(readable, file.createWriteStream());
        const [metadata] = await file.getMetadata();
        if (deleteEmptyFiles && metadata.size === '0') { // metadata.size is a string!
            logVerbose`GCSStoreDelegate: deleting empty file ${filename}`;
            await file.delete();
            return null;
        }
        return getRegressionMode() ? 'TS1' : String(metadata.generation);
    }

    async deleteFiles(filenames) {
        this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
        for (const filename of filenames) {
            const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
            await file.delete();
        }
    }
}
