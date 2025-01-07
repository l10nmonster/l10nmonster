import path from 'path';
import { L10nContext } from '@l10nmonster/core';
import { FsStoreDelegate } from './fsStoreDelegate.js';
import { FileBasedJobStore } from './fileBasedJobStore.js';

export class JsonJobStore extends FileBasedJobStore {
    constructor({ jobsDir } = {}) {
        super(new FsStoreDelegate(path.join(L10nContext.baseDir, jobsDir ?? 'l10njobs')));
    }
}
