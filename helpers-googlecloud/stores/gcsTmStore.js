import { GCSStoreDelegate } from './gcsStoreDelegate.js';
import { stores } from '@l10nmonster/core';

export class GCSLegacyJsonTmStore extends stores.LegacyFileBasedTmStore {
    constructor({ name, bucketName, bucketPrefix }) {
        super(new GCSStoreDelegate(bucketName, bucketPrefix), name);
    }
}

export class GCSJsonlTmStore extends stores.BaseJsonlTmStore {
    constructor(options) {
        const { bucketName, bucketPrefix, ...tmStoreOptions } = options;
        super(new GCSStoreDelegate(bucketName, bucketPrefix), tmStoreOptions);
    }
}
