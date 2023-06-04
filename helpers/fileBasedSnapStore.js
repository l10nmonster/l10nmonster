module.exports = class FileBasedSnapStore {
    constructor(delegate) {
        if (!delegate) {
            throw 'A delegate is required to instantiate a FileBasedSnapStore';
        }
        this.delegate = delegate;
    }

    #saveTOC(TOC) {
        this.TOC = TOC;
        this.ridLookup = {};
        Object.entries(TOC).forEach(([ filename, resObj ]) => Object.keys(resObj).forEach(rid => this.ridLookup[rid] = filename));
    }

    async #getTOC() {
        if (this.TOC) {
            return this.TOC;
        } else {
            try {
                this.#saveTOC(JSON.parse(await this.delegate.readFile('TOC.json')));
            } catch (e) {
                this.TOC = {};
                this.ridLookup = {};
            }
        }
    }

    async startSnapshot() {
        const filenames = await this.delegate.getExistingFileNames();
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
        await this.delegate.saveFile('TOC.json', JSON.stringify(this.newTOC, null, '\t'));
        this.filesToNuke['TOC.json'] = false;
        await this.delegate.deleteFiles(Object.entries(this.filesToNuke).filter(e => e[1]).map(e => e[0]));
        this.#saveTOC(this.newTOC);
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
        const TOC = await this.#getTOC();
        for (const filename of Object.keys(TOC)) {
            const resources = JSON.parse(await this.delegate.getFile(filename));
            for (const res of Object.values(resources)) {
                yield res;
            }
        }
    }
};
