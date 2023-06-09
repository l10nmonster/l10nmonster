import path from 'path';

import { GCSStoreDelegate } from './gcsStoreDelegate.js';
import { FileBasedJobStore } from './fileBasedJobStore.js';

export class GCSJobStore extends FileBasedJobStore {
    constructor({ bucketName, jobsDir } = {}) {
        super(new GCSStoreDelegate(bucketName, jobsDir));
    }
}
