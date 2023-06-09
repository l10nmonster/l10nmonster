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
        this.bucketPrefix = bucketPrefix;
        this.storage = new Storage();
    }

    async listAllFiles() {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            if (!this.files){
                const [files] = await this.bucket.getFiles({ prefix: this.bucketPrefix });
                this.files = files;    
            }
            const filenames = this.files.map(f=>f.name);
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
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const gcsContents = await this.bucket.file(filename).download();
            return gcsContents.toString();
        } catch(e) {
            l10nmonster.logger.error(e.stack ?? e);
        }
    }

    async saveFile(filename, contents) {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            const file = this.bucket.file(filename);
            return file.save(contents);
        } catch(e) {
            l10nmonster.logger.error(e.stack ?? e);
        }
    }

    async deleteFiles(filenames) {
        try {
            this.bucket || (this.bucket = await this.storage.bucket(this.bucketName));
            for (const filename of filenames) {
                const file = this.bucket.file(filename);
                await file.delete();  
            }  
        } catch(e) {
            l10nmonster.logger.error(e.stack ?? e);
        }
    }
}
