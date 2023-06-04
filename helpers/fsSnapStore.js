const path = require('path');
const {
    mkdir,
    readdir,
    readFile,
    writeFile,
    unlink,
} = require('node:fs/promises');

class FsSnapStoreDelegate {
    constructor(snapDir) {
        this.snapDir = snapDir;
    }

    async getExistingFileNames() {
        await mkdir(this.snapDir, { recursive: true });
        const dirContents = await readdir(this.snapDir, { withFileTypes:true });
        return dirContents.filter(e => e.isFile()).map(e => e.name);
    }

    async getFile(filename) {
        return readFile(path.join(this.snapDir, filename));
    }

    async saveFile(filename, contents) {
        return writeFile(path.join(this.snapDir, filename), contents, 'utf8');
    }

    async deleteFiles(filenames) {
        for (const filename of filenames) {
            await unlink(path.join(this.snapDir, filename));
        }
    }
}

const { sharedCtx } = require('.'); // circular dependency :(
const FileBasedSnapStore = require('./fileBasedSnapStore');

module.exports = class FsSnapStore extends FileBasedSnapStore {
    constructor({ snapDir } = {}) {
        super(new FsSnapStoreDelegate(path.join(sharedCtx().baseDir, snapDir ?? 'snap')));
    }
}
