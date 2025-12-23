import { GCSStoreDelegate } from './gcsStoreDelegate.js';
import { stores } from '@l10nmonster/core';

/**
 * Legacy GCS-based TM store using JSON files.
 */
export class GCSLegacyJsonTmStore extends stores.LegacyFileBasedTmStore {
    constructor({ id, bucketName, bucketPrefix, parallelism }) {
        super({
            delegate: new GCSStoreDelegate(bucketName, bucketPrefix),
            id,
            parallelism
        });
    }
}

/**
 * GCS-based TM store using JSONL format.
 */
export class GCSJsonlTmStore extends stores.BaseJsonlTmStore {
    constructor(options) {
        const { bucketName, bucketPrefix, ...tmStoreOptions } = options;
        super(new GCSStoreDelegate(bucketName, bucketPrefix), tmStoreOptions);
    }
}
