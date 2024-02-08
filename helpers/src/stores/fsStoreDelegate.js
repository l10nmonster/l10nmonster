import path from 'path';
import {
    mkdir,
    readdir,
    readFile,
    writeFile,
    unlink,
} from 'node:fs/promises';

export class FsStoreDelegate {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    async listAllFiles(dir) {
        dir ??= '';
        const fileNames = [];
        const dirContents = await readdir(path.join(this.baseDir, dir), { withFileTypes:true });
        fileNames.push(dirContents.filter(e => e.isFile()).map(e => path.join(dir, e.name)));
        const subdirs = dirContents.filter(e => e.isDirectory()).map(subdir => subdir.name);
        for (const subdir of subdirs) {
            fileNames.push(await this.listAllFiles(path.join(dir, subdir)));
        }
        return fileNames.flat(1);
    }

    async ensureBaseDirExists() {
        return mkdir(this.baseDir, { recursive: true });
    }

    async getFile(filename) {
        return readFile(path.join(this.baseDir, filename), 'utf8');
    }

    async saveFile(filename, contents) {
        Array.isArray(filename) && (filename = path.join(...filename));
        const dir = path.dirname(path.join(this.baseDir, filename));
        await mkdir(dir, { recursive: true });
        return writeFile(path.join(this.baseDir, filename), contents, 'utf8');
    }

    async deleteFiles(filenames) {
        for (const filename of filenames) {
            await unlink(path.join(this.baseDir, filename));
        }
    }
}
