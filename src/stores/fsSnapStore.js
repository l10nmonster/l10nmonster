import * as path from 'path';
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
    unlinkSync,
} from 'fs';

export class FsSnapStore {
    constructor({ snapDir } = {}) {
        this.snapDir = path.join(this.ctx.baseDir, snapDir ?? 'snap');
        try {
            this.TOC = JSON.parse(readFileSync(path.join(this.snapDir, 'TOC.json')));
            this.#generateRidLookup();
        } catch (e) {
            this.TOC = {};
            this.ridLookup = {};
        }
    }

    #generateRidLookup() {
        this.ridLookup = {};
        Object.entries(this.TOC).forEach(([ filename, resObj ]) => Object.keys(resObj).forEach(rid => this.ridLookup[rid] = filename));
    }

    async startSnapshot() {
        !existsSync(this.snapDir) && mkdirSync(this.snapDir, { recursive: true });
        this.filesToNuke = Object.fromEntries(readdirSync(this.snapDir, { withFileTypes:true }).filter(e => e.isFile()).map(e => [e.name, true]));
        this.newTOC = {};
    }

    async commitResources(prj, chunk, resources) {
        const filename = `${prj}-${chunk}.json`;
        writeFileSync(path.join(this.snapDir, filename), JSON.stringify(resources, null, '\t'), 'utf8');
        this.filesToNuke[filename] = false;
        this.newTOC[filename] = Object.fromEntries(resources.map(res => {
            // eslint-disable-next-line no-unused-vars
            const { segments, ...manifest } = res;
            return [ res.id, manifest ];
        }));
    }

    async endSnapshot() {
        writeFileSync(path.join(this.snapDir, 'TOC.json'), JSON.stringify(this.newTOC, null, '\t'), 'utf8');
        this.filesToNuke['TOC.json'] = false;
        Object.entries(this.filesToNuke).filter(e => e[1]).forEach(e => unlinkSync(path.join(this.snapDir, e[0])));
        this.TOC = this.newTOC;
        this.#generateRidLookup();
    }

    async getResourceStats() {
        return Object.values(this.TOC).map(obj => Object.values(obj)).flat(1);
    }

    async getResource(rs) {
        const resources = JSON.parse(readFileSync(path.join(this.snapDir, this.ridLookup[rs.id])));
        return resources[rs.id];
    }

    async *getAllResources() {
        for (const filename of Object.keys(this.TOC)) {
            const resources = JSON.parse(readFileSync(path.join(this.snapDir, filename)));
            for (const res of Object.values(resources)) {
                yield res;
            }
        }
    }
}
