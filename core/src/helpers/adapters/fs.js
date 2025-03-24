import * as path from 'path';
import {
    existsSync,
    unlinkSync,
    statSync,
    readFileSync,
    mkdirSync,
    writeFileSync,
} from 'fs';
import { globbySync } from 'globby';
import { L10nContext } from '@l10nmonster/core';

class AbstractFsAdapter {
    #relativeBaseDir;
    baseDir;

    constructor(baseDir) {
        this.#relativeBaseDir = baseDir;
        this.baseDir = baseDir ? path.resolve(L10nContext.baseDir, baseDir) : L10nContext.baseDir;
    }

    setChannelOptions(options) {
        options.baseDir && this.#relativeBaseDir && (this.baseDir = path.resolve(options.baseDir, this.#relativeBaseDir));
    }
}

/**
 * A file system source adapter for fetching resources.
 */
export class FsSource extends AbstractFsAdapter {
    globs;
    filter;
    sourceLang;
    prj;
    resDecorator;
    idFromPath;
    pathFromId;

    /**
     * Creates a new FsSource instance.
     * @param {Object} options - Configuration options for the source.
     * @param {string} [options.baseDir] - Base directory for resource files.
     * @param {string} options.sourceLang - The source language of the resources.
     * @param {string | string[]} options.globs - glob or array of glob patterns to match resource files.
     * @param {Function} [options.filter] - Function to filter resources based on their IDs.
     * @param {string} [options.prj] - Project identifier for the resources.
     * @param {Function} [options.resDecorator] - Function to decorate resource metadata.
     * @param {Function} [options.idFromPath] - Function to derive resource ID from file path.
     * @param {Function} [options.pathFromId] - Function to derive file path from resource ID.
     * @throws {string} Throws an error if `globs` is not provided.
     */
    constructor({ baseDir, globs, filter, sourceLang, prj, resDecorator, idFromPath, pathFromId }) {
        super(baseDir);
        if (globs === undefined || sourceLang === undefined) {
            throw 'globs and sourceLang properties are required in FsSource';
        } else {
            this.globs = Array.isArray(globs) ? globs : [ globs ];
            this.filter = filter;
            this.sourceLang = sourceLang;
            this.prj = prj;
            this.resDecorator = resDecorator;
            this.idFromPath = idFromPath;
            this.pathFromId = pathFromId;
        }
    }

    /**
     * Fetches metadata for all resources matching the glob patterns.
     * @returns {Promise<Object[]>} Array of resource metadata objects.
     */
    async fetchResourceStats() {
        const resources = [];
        const expandedFileNames = globbySync(this.globs.map(g => path.join(this.baseDir, g)));
        L10nContext.logger.info(`Fetched fs globs: ${this.globs}`);
        for (const fileName of expandedFileNames) {
            let id = path.relative(this.baseDir, fileName);
            if (typeof this.idFromPath === 'function') {
                id = this.idFromPath(id);
            }
        if (!this.filter || this.filter(id)) {
                const stats = statSync(fileName);
                let resMeta = {
                    id,
                    modified: L10nContext.regression ? 1 : stats.mtime.toISOString(),
                };
                resMeta.sourceLang = this.sourceLang;
                this.prj && (resMeta.prj = this.prj);
                if (typeof this.resDecorator === 'function') {
                    resMeta = this.resDecorator(resMeta);
                }
                resources.push(resMeta);
            }
        }
        return resources;
    }

    /**
     * Fetches the content of a specific resource.
     * @param {string} resourceId - The ID of the resource to fetch.
     * @returns {Promise<string>} The content of the resource.
     */
    async fetchResource(resourceId) {
        if (typeof this.pathFromId === 'function') {
            resourceId = this.pathFromId(resourceId);
        }
        return readFileSync(path.resolve(this.baseDir, resourceId), 'utf8');
    }
}

/**
 * Represents a file system target for storing translated resources.
 */
export class FsTarget extends AbstractFsAdapter {
    targetPath;
    deleteEmpty;

    /**
     * Creates a new FsTarget instance.
     * @param {Object} options - Configuration options for the target.
     * @param {string} [options.baseDir] - Base directory for translated files.
     * @param {Function} options.targetPath - Function to determine target path.
     * @param {boolean} [options.deleteEmpty] - Whether to delete empty files.
     */
    constructor({ baseDir, targetPath, deleteEmpty }) {
        super(baseDir);
        this.targetPath = targetPath;
        this.deleteEmpty = deleteEmpty;
}

    /**
     * Generates the path for a translated resource.
     * @param {string} lang - The target language.
     * @param {string} resourceId - The ID of the resource.
     * @returns {string} The full path to the translated resource.
     */
    translatedResourceId(lang, resourceId) {
        return path.resolve(this.baseDir, this.targetPath(lang, resourceId));
    }

    /**
     * Fetches a translated resource from the file system.
     * @param {string} lang - The target language.
     * @param {string} resourceId - The ID of the resource.
     * @returns {Promise<string>} The content of the translated resource.
     */
    async fetchTranslatedResource(lang, resourceId) {
        return readFileSync(this.translatedResourceId(lang, resourceId), 'utf8');
    }

    /**
     * Saves or deletes a translated resource in the file system.
     * @param {string} lang - The target language of the translated resource.
     * @param {string} resourceId - The ID of the resource.
     * @param {string|null} translatedRes - The translated content
     * If null, the file is deleted instead of written.
     * @return {Promise<void>}
     */
    async commitTranslatedResource(lang, resourceId, translatedRes) {
        const translatedPath = this.translatedResourceId(lang, resourceId);
        if (translatedRes === null) {
            this.deleteEmpty && existsSync(translatedPath) && unlinkSync(translatedPath);
        } else {
            mkdirSync(path.dirname(translatedPath), {recursive: true});
            writeFileSync(translatedPath, translatedRes, 'utf8');
        }
    }
}
