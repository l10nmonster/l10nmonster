const path = require('path');

const { sharedCtx, FsStoreDelegate } = require('.'); // circular dependency :(
const FileBasedSnapStore = require('./fileBasedSnapStore');

module.exports = class FsSnapStore extends FileBasedSnapStore {
    constructor({ snapDir } = {}) {
        super(new FsStoreDelegate(path.join(sharedCtx().baseDir, snapDir ?? 'snap')));
    }
}
