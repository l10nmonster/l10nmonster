const { adapters } = require('@l10nmonster/helpers');

exports.MySource = class MySource {
    constructor({ baseDir, globs, resourceFormat }) {
        this.globs = globs;
        this.resourceFormat = resourceFormat;
        this.FsSource = new adapters.FsSource({ baseDir, globs });
    }

    #mapSegments(rows) {
        return rows.map(entry => {
            const e = entry.split('=');
            return {
                sid: e[0],
                str: e[1],
                mf: 'java',
            };
        });
    }
    
    async #makeResource(row) {
        const bundle = await this.FsSource.fetchResource(row.id);
        const response = JSON.stringify({
            segments : this.#mapSegments(bundle.split('\n')),
        });
        return response;
    }
    
    #makeStats(row) {
        return {
            id: row.id,
            modified: row.modifiedAt,
            prj: row.id,
            resourceFormat: this.resourceFormat
        };
    }
    
    async fetchResourceStats() {
        const rows = await this.FsSource.fetchResourceStats();
        return rows.map(row=> this.#makeStats(row));
    }

    async *fetchAllResources(resourceId) {
        console.log(`Fetching all resources for ${resourceId||'all'}`);
        const rows = await this.FsSource.fetchResourceStats();
        for (const row of rows) {
            yield [this.#makeStats(row), await this.#makeResource(row)];
        }
    }
}

exports.MyTarget = class MyTarget {
    constructor({ baseDir, targetPath }){
        this.FsTarget = new adapters.FsTarget({
            baseDir, targetPath
        });
    }

    translatedResourceId(lang, resourceId) {
        return this.FsTarget.translatedResourceId(lang, resourceId);
    }

    async fetchTranslatedResource(lang, resourceId) {
        return this.FsTarget.fetchTranslatedResource(lang, resourceId);
    }

    async commitTranslatedResource(lang, resourceId, translatedRes) {
        const translations = JSON.parse(translatedRes).segments;
        const messages = translations.map((t,i)=>`${t.sid}=${t.str}`);
        this.FsTarget.commitTranslatedResource(lang, resourceId, messages.join('\n'));
    }
}
