import { adapters } from '@l10nmonster/core';

export class MySource {
    constructor({ baseDir, globs, sourceLang, resourceFormat }) {
        this.resourceFormat = resourceFormat;
        this.FsSource = new adapters.FsSource({ sourceLang, baseDir, globs });
    }

    #mapSegments(rows) {
        return rows.filter(str => str.includes('=')).map(entry => {
            const e = entry.split('=');
            return {
                sid: e[0],
                str: e[1],
                mf: 'java',
            };
        });
    }

    async #makeResource(bundleContent) {
        const response = JSON.stringify({
            segments : this.#mapSegments(bundleContent.split('\n')),
        });
        return response;
    }

    #makeStats(fsStat) {
        return {
            id: fsStat.id,
            sourceLang: fsStat.sourceLang, // Assuming fsStat has sourceLang
            modified: fsStat.modified, // Assuming fsStat has modified
            prj: fsStat.id, // Or fsStat.prj if available and preferred
            resourceFormat: this.resourceFormat
        };
    }

    async *fetchAllResources() {
        console.log(`Fetching all resources for all`);
        for await (const [fsStat, fsContent] of this.FsSource.fetchAllResources()) {
            // fsStat is the metadata object from the underlying FsSource
            // fsContent is the raw string content from the underlying FsSource
            const customStats = this.#makeStats(fsStat);
            const customResource = await this.#makeResource(fsContent);
            yield [customStats, customResource];
        }
    }
}

export class MyTarget {
    constructor({ targetPath }) {
        this.FsTarget = new adapters.FsTarget({ targetPath });
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
