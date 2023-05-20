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

function writeResource(snapDir, resource) {
        writeFileSync(path.join(snapDir, `${mangleResourceId(resource.id)}.json`), JSON.stringify(resource, null, '\t'), 'utf8');
}

export class FsSnapStore {
    constructor({ snapDir, splitByPrj }) {
        this.snapDir = path.join(this.ctx.baseDir, snapDir ?? 'snap');
        this.splitByPrj = splitByPrj;
    }

    async startSnapshot() {
        existsSync(this.snapDir) && rmSync(this.snapDir, { recursive: true });
        mkdirSync(this.snapDir, { recursive: true });
    }

    async commitResource(resource) {
        if (this.splitByPrj) {
            writeResource(path.join(this.snapDir, resource.prj ?? 'default'), resource);
        } else {
            writeResource(this.snapDir, resource);
        }
    }

    async endSnapshot() {
    }
}
