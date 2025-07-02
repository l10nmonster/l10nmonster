import path from 'path';
import { getBaseDir } from '../../l10nContext.js';
import { FsStoreDelegate } from './fsStoreDelegate.js';
import { LegacyFileBasedTmStore } from './legacyFileBasedTmStore.js';
import { BaseJsonlTmStore } from './baseJsonlTmStore.js';

export class FsLegacyJsonTmStore extends LegacyFileBasedTmStore {
    constructor({ jobsDir, id, parallelism }) {
        super({ 
            delegate: new FsStoreDelegate(path.join(getBaseDir(), jobsDir)), 
            id,
            parallelism 
        });
    }
}

export class FsJsonlTmStore extends BaseJsonlTmStore {
    constructor(options) {
        super(new FsStoreDelegate(path.join(getBaseDir(), options.jobsDir)), options);
    }
}
