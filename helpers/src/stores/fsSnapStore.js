import path from 'path';

import { FsStoreDelegate } from './fsStoreDelegate.js';
import { FileBasedSnapStore } from './fileBasedSnapStore.js';

export class FsSnapStore extends FileBasedSnapStore {
    constructor({ snapDir } = {}) {
        super(new FsStoreDelegate(path.join(l10nmonster.baseDir, snapDir ?? 'snap')));
    }
}
