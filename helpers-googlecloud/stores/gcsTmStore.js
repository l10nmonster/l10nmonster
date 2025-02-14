import { GCSStoreDelegate } from './gcsStoreDelegate.js';
import { stores } from '@l10nmonster/core';

export class GCSTmStore extends stores.LegacyFileBasedTmStore {
    constructor({ bucketName, bucketPrefix }) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix));
    }
}
