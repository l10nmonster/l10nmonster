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
            if (!this.files) {
                const [files] = await this.bucket.getFiles({ prefix: this.bucketPrefix });
                this.files = files;
            }
            const filenames = this.files.map(f=>f.name.replace(`${this.bucketPrefix}/`, ""));
            return filenames;
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

    async saveFile(filename, contents) {
        try {
            Array.isArray(filename) && (filename = filename.join('/'));
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const file = this.bucket.file(`${this.bucketPrefix}/${filename}`);
            return file.save(contents);
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
