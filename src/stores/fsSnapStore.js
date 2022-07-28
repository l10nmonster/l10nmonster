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

function writeSnapshot(snapDir, snapshot) {
    existsSync(snapDir) && rmSync(snapDir, { recursive: true });
    mkdirSync(snapDir, { recursive: true });
    for (const source of snapshot) {
        writeFileSync(path.join(snapDir, `${mangleResourceId(source.id)}.json`), JSON.stringify(source, null, '\t'), 'utf8');
    }
}

export class FsSnapStore {
    constructor({ snapDir, splitByPrj }) {
        this.snapDir = path.join(this.ctx.baseDir, snapDir ?? 'snap');
        this.splitByPrj = splitByPrj;
    }

    async commitSnapshot(snapshot) {
        if (this.splitByPrj) {
            const prjMap = {};
            for (const source of snapshot) {
                const prj = source.prj ?? 'default';
                prjMap[prj] ??= [];
                prjMap[prj].push(source);
            }
            for (const prj of Object.keys(prjMap)) {
                writeSnapshot(path.join(this.snapDir, prj), prjMap[prj]);
            }
        } else {
            writeSnapshot(this.snapDir, snapshot);
        }
    }
}
