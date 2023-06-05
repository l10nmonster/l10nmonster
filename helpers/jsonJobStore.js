const path = require('path');

const { sharedCtx, FsStoreDelegate } = require('.'); // circular dependency :(
const FileBasedJobStore = require('./fileBasedJobStore');

module.exports = class JsonJobStore extends FileBasedJobStore {
    constructor({ jobsDir } = {}) {
        super(new FsStoreDelegate(path.join(sharedCtx().baseDir, jobsDir ?? 'l10njobs')));
    }
}
