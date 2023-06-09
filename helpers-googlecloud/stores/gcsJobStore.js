const path = require('path');

const GCSStoreDelegate = require('./gcsStoreDelegate.js');
const { stores } = require('@l10nmonster/helpers');

module.exports = class GCSJobStore extends stores.FileBasedJobStore {
    constructor({ bucketName, jobsDir } = {}) {
        super(new GCSStoreDelegate(bucketName, jobsDir));
    }
}
