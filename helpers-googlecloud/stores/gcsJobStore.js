import { GCSStoreDelegate } from './gcsStoreDelegate.js';
import { stores } from '@l10nmonster/core';

export class GCSJobStore extends stores.FileBasedJobStore {
    constructor({ bucketName, bucketPrefix } = {}) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix));
    }
}
