import path from 'path';
import { L10nContext } from '@l10nmonster/core';
import { FsStoreDelegate } from './fsStoreDelegate.js';
import { FileBasedSnapStore } from './fileBasedSnapStore.js';

export class FsSnapStore extends FileBasedSnapStore {
    constructor({ snapDir } = {}) {
        super(new FsStoreDelegate(path.join(L10nContext.baseDir, snapDir ?? 'snap')));
    }
}
