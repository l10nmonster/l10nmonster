import { L10nContext } from '@l10nmonster/core';

const SNAPSTORE_SCHEME_VERSION = 1;

export class FileBasedSnapStore {
    constructor(delegate) {
        if (!delegate) {
            throw 'A delegate is required to instantiate a FileBasedSnapStore';
        }
        this.delegate = delegate;
    }

    #updateTOC(TOC) {
        this.TOC = TOC;
        this.ridLookup = {};
        Object.entries(TOC).forEach(([ filename, resObj ]) => Object.keys(resObj).forEach(rid => this.ridLookup[rid] = filename));
    }

    async #getTOC() {
        if (!this.TOC) {
            let tocFile;
            try {
                tocFile = JSON.parse(await this.delegate.getFile('TOC.json'));
            } catch (e) {
                throw `Unable to read Snap Store: ${e}`;
            }
            if (tocFile.version !== SNAPSTORE_SCHEME_VERSION) {
                throw `Snap Store is outdated`;
            }
            this.#updateTOC(tocFile.chunkMap);
    }
        return this.TOC;
    }

    async startSnapshot() {
        await this.delegate.ensureBaseDirExists();
        const filenames = await this.delegate.listAllFiles();
        this.filesToNuke = Object.fromEntries(filenames.map(e => [e, true]));
        this.newTOC = {};
    }

    async commitResources(prj, chunk, resources) {
        const filename = `${prj}-${chunk}.json`;
        await this.delegate.saveFile(filename, JSON.stringify(resources, null, '\t'));
        this.filesToNuke[filename] = false;
        this.newTOC[filename] = Object.fromEntries(Object.values(resources).map(res => {
            // eslint-disable-next-line no-unused-vars
            const { segments, ...manifest } = res;
            return [ res.id, manifest ];
        }));
    }

    async endSnapshot() {
        await this.delegate.saveFile('TOC.json', JSON.stringify({
            version: SNAPSTORE_SCHEME_VERSION,
            chunkMap: this.newTOC
        }, null, '\t'));
        this.filesToNuke['TOC.json'] = false;
        await this.delegate.deleteFiles(Object.entries(this.filesToNuke).filter(e => e[1]).map(e => e[0]));
        this.#updateTOC(this.newTOC);
    }

    async getResourceStats() {
        const TOC = await this.#getTOC();
        return Object.values(TOC).map(obj => Object.values(obj)).flat(1);
    }

    async getResource(rs) {
        const resources = JSON.parse(await this.delegate.getFile(this.ridLookup[rs.id]));
        return resources[rs.id];
    }

    async *getAllResources() {
        // ignoring options passed as parameters as we don't store raw in snaps. TODO: should we?
        const TOC = await this.#getTOC();
        for (const filename of Object.keys(TOC)) {
            const resources = JSON.parse(await this.delegate.getFile(filename));
            for (const res of Object.values(resources)) {
                if (L10nContext.prj === undefined || L10nContext.prj.includes(res.prj)) {
                    yield res;
                }
            }
        }
    }
}
