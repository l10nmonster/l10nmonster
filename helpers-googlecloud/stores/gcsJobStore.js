const GCSStoreDelegate = require('./gcsStoreDelegate.js');
const { stores } = require('@l10nmonster/helpers');

module.exports = class GCSJobStore extends stores.FileBasedJobStore {
    constructor({ bucketName, bucketPrefix } = {}) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix));
    }
}
