import * as path from 'path';
import * as fs from 'fs/promises';
import { globbySync } from 'globby';

export class FsSource {
    constructor({ globs, filter }) {
        this.globs = globs;
        this.filter = filter;
    }

    async fetchResourceStats() {
        const resources = [];
        let expandedFileNames = globbySync(this.globs.map(g => path.join(this.ctx.baseDir, g)));
        if (this.filter) {
            expandedFileNames = expandedFileNames.filter(this.filter);
        }
        for (const fileName of expandedFileNames) {
            const stats = await fs.stat(fileName);
            resources.push({
                id: path.relative(this.ctx.baseDir, fileName),
                modified: stats.mtime.toISOString(),
            });
        }
        return resources;
    }

    async fetchResource(resourceId) {
        return fs.readFile(path.resolve(this.ctx.baseDir, resourceId), 'utf8'); // TODO: do we need a flag to use `readFile` for binary resources?
    }
}

export class FsTarget {
    constructor({ targetPath }) {
        this.targetPath = targetPath;
    }

    async fetchTranslatedResource(lang, resourceId) {
        const translatedPath = path.resolve(this.ctx.baseDir, this.targetPath(lang, resourceId));
        return fs.readFile(translatedPath, 'utf8'); // TODO: do we need a flag to use `readFile` for binary resources?
    }

    async commitTranslatedResource(lang, resourceId, translatedRes) {
        const translatedPath = path.resolve(this.ctx.baseDir, this.targetPath(lang, resourceId));
        await fs.mkdir(path.dirname(translatedPath), {recursive: true});
        fs.writeFile(translatedPath, translatedRes, 'utf8');  // TODO: do we need a flag to write binary resources?
    }
}
