import { GCSStoreDelegate } from './gcsStoreDelegate.js';
import { stores } from '@l10nmonster/core';

export class GCSSnapStore extends stores.FileBasedSnapStore {
    constructor({ bucketName, bucketPrefix } = {}) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix));
    }
}
