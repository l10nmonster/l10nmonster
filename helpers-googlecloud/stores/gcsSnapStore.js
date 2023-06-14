const GCSStoreDelegate = require('./gcsStoreDelegate.js');
const { stores } = require('@l10nmonster/helpers');

module.exports = class GCSSnapStore extends stores.FileBasedSnapStore {
    constructor({ bucketName, bucketPrefix } = {}) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix));
    }
}
