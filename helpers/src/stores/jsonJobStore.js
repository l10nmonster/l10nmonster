import path from 'path';

import { FsStoreDelegate } from './fsStoreDelegate.js';
import { FileBasedJobStore } from './fileBasedJobStore.js';

export class JsonJobStore extends FileBasedJobStore {
    constructor({ jobsDir } = {}) {
        super(new FsStoreDelegate(path.join(l10nmonster.baseDir, jobsDir ?? 'l10njobs')));
    }
}
