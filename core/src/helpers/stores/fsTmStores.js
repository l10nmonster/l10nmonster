import path from 'path';
import { L10nContext } from '@l10nmonster/core';
import { FsStoreDelegate } from './fsStoreDelegate.js';
import { LegacyFileBasedTmStore } from './legacyFileBasedTmStore.js';
import { BaseJsonlTmStore } from './baseJsonlTmStore.js';

export class FsLegacyJsonTmStore extends LegacyFileBasedTmStore {
    constructor({ jobsDir, id }) {
        super(new FsStoreDelegate(path.join(L10nContext.baseDir, jobsDir)), id);
    }
}

export class FsJsonlTmStore extends BaseJsonlTmStore {
    constructor(options) {
        super(new FsStoreDelegate(path.join(L10nContext.baseDir, options.jobsDir)), options);
    }
}
