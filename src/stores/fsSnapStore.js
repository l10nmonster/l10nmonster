import * as path from 'path';
import {
    existsSync,
    rmSync,
    mkdirSync,
    writeFileSync,
} from 'fs';

function mangleResourceId(id) {
    return id.replaceAll('/', '$').replaceAll('\\', '$');
}

export class FsSnapStore {
    constructor({ snapDir }) {
        this.snapDir = path.join(this.ctx.baseDir, snapDir ?? 'snap');
    }

    async commitSnapshot(snapshot) {
        existsSync(this.snapDir) && rmSync(this.snapDir, { recursive: true });
        mkdirSync(this.snapDir, { recursive: true });
        for (const source of snapshot) {
            writeFileSync(path.join(this.snapDir, `${mangleResourceId(source.id)}.json`), JSON.stringify(source, null, '\t'), 'utf8');
        }
    }
}
