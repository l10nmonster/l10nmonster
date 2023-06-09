const GCSStoreDelegate = require('./gcsStoreDelegate.js');
const { stores } = require('@l10nmonster/helpers');

export class GCSSnapStore extends FileBasedSnapStore {
    constructor({ bucketName, bucketPrefix } = {}) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix));
    }
}
