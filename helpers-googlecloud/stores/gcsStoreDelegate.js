const { Storage } = require('@google-cloud/storage');
const path = require('path');
const {
    mkdir,
    readdir,
    readFile,
    writeFile,
    unlink,
} = require('node:fs/promises');

module.exports = class GCSStoreDelegate {
    constructor(bucketName, bucketPrefix) {
        this.bucketName = bucketName;
        this.bucketPrefix = bucketPrefix || 'jobs';
    }

    async listAllFiles() {
        try {
            // console.time('gcs');
            const storage = new Storage();
            // console.timeLog('gcs');
            this.bucket = await storage.bucket(this.bucketName);
            // console.timeLog('gcs');
            const [files] = await this.bucket.getFiles({ prefix: this.bucketPrefix });
            // console.timeEnd('gcs');
            const filenames = files.map(f=>f.name);
            return filenames;
        } catch(e) {
            l10nmonster.logger.error(e.stack ?? e);
        }
    }

    async ensureBaseDirExists() {
        return;
    }

    async getFile(filename) {      
        try {
            const gcsContents = await this.bucket.file(filename).download();
            return gcsContents.toString();
        } catch(e) {
            l10nmonster.logger.error(e.stack ?? e);
        }
    }

    async saveFile(filename, contents) {
    }

    async deleteFiles(filenames) {
    }
}
