import { Storage }  from '@google-cloud/storage';
import path from 'path';
import {
    mkdir,
    readdir,
    readFile,
    writeFile,
    unlink,
} from 'node:fs/promises';

export class GCSStoreDelegate {
    constructor(bucketName, jobsFolder) {
        this.bucketName = bucketName;
        this.jobsFolder = jobsFolder || 'jobs';
    }

    async listAllFiles() {
        try {
            const storage = new Storage();
            this.bucket = await storage.bucket(this.bucketName)
            const [files] = await this.bucket.getFiles();
            const filenames = files.map(f=>f.name.replace(`${this.jobsFolder}/`,""));
            return filenames;
        } catch(e) {
            console.log(e);
        }

    }

    async ensureBaseDirExists() {
        return;
    }

    async getFile(filename) {      
        try {
            const gcsContents = await this.bucket.file(`${this.jobsFolder}/${filename}`).download();
            return gcsContents.toString();
        } catch(e) {
            console.log(e);
        }
    }

    async saveFile(filename, contents) {
    }

    async deleteFiles(filenames) {
    }
}
