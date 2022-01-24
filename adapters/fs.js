import * as path from 'path';
import * as fs from 'fs/promises';
import { globbySync } from 'globby';

export class FsSource {
    constructor({ globs, filter, targetLangs, resDecorator }) {
        if (globs === undefined || (targetLangs || resDecorator) === undefined) {
            throw 'You must specify globs, targetLangs (directly or via resDecorator) in FsSource';
        } else {
            this.globs = globs;
            this.filter = filter;
            this.targetLangs = targetLangs;
            this.resDecorator = resDecorator;
        }
    }

    async fetchResourceStats() {
        const resources = [];
        const expandedFileNames = globbySync(this.globs.map(g => path.join(this.ctx.baseDir, g)));
        for (const fileName of expandedFileNames) {
            const id = path.relative(this.ctx.baseDir, fileName);
            if (!this.filter || this.filter(id)) {
                const stats = await fs.stat(fileName);
                let resMeta = {
                    id,
                    modified: stats.mtime.toISOString(),
                    targetLangs: this.targetLangs,
                };
                if (typeof this.resDecorator === 'function') {
                    resMeta = this.resDecorator(resMeta);
                }
                resources.push(resMeta);
            }
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

    translatedResourceId(lang, resourceId) {
        return path.resolve(this.ctx.baseDir, this.targetPath(lang, resourceId));
    }

    async fetchTranslatedResource(lang, resourceId) {
        return fs.readFile(this.translatedResourceId(lang, resourceId), 'utf8'); // TODO: do we need a flag to use `readFile` for binary resources?
    }

    async commitTranslatedResource(lang, resourceId, translatedRes) {
        const translatedPath = path.resolve(this.ctx.baseDir, this.targetPath(lang, resourceId));
        await fs.mkdir(path.dirname(translatedPath), {recursive: true});
        fs.writeFile(translatedPath, translatedRes, 'utf8');  // TODO: do we need a flag to write binary resources?
    }
}
