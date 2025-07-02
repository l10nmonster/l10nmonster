import * as path from 'path';
import {
    existsSync,
    unlinkSync,
    // statSync, // No longer needed directly here
    readFileSync, // Restored for FsTarget
    mkdirSync,
    writeFileSync,
} from 'fs';
import * as fsPromises from 'fs/promises';
import { L10nContext } from '../../l10nContext.js';

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
     * @throws {string} Throws an error if `globs` is not provided.
     */
    constructor({ baseDir, globs, filter, sourceLang, prj, resDecorator, idFromPath }) {
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
        }
    }

    /**
     * Fetches all resources matching the glob patterns.
     * Yields an array for each resource: [resourceMeta, resourceContent].
     * @returns {AsyncGenerator<[Object, string]>} An async generator yielding resource stat-like metadata and content.
     */
    async* fetchAllResources() {
        L10nContext.logger.info(`FsSource: Fetching all resources with globs: ${this.globs.join(', ')} in baseDir: ${this.baseDir}`);
        // fsPromises.glob returns paths relative to cwd by default.
        // We need to make them relative to this.baseDir for id generation,
        // or provide an absolute path to glob and then make them relative.
        // Using `cwd: this.baseDir` makes the paths returned by glob relative to baseDir.
        const globOptions = {
            cwd: this.baseDir,
            nodir: true, // we only want files
        };

        for (const globPattern of this.globs) {
            L10nContext.logger.verbose(`FsSource: Processing glob pattern: ${globPattern} in ${this.baseDir}`);
            try {
                for await (const relativePathFromGlob of fsPromises.glob(globPattern, globOptions)) {
                    // relativePathFromGlob is already relative to this.baseDir due to cwd option
                    const fullPath = path.join(this.baseDir, relativePathFromGlob);
                    let id = relativePathFromGlob; // Use the path returned by glob as the base for ID

                    if (typeof this.idFromPath === 'function') {
                        id = this.idFromPath(id);
                    }

                    if (this.filter && !this.filter(id)) {
                        L10nContext.logger.verbose(`FsSource: Filtered out resource ${id} (path: ${relativePathFromGlob}) due to filter function.`);
                        continue;
                    }

                    try {
                        const stats = await fsPromises.stat(fullPath);
                        let resMeta = {
                            id,
                            modified: L10nContext.regression ? 1 : stats.mtime.toISOString(),
                        };
                        resMeta.sourceLang = this.sourceLang;
                        this.prj && (resMeta.prj = this.prj);
                        if (typeof this.resDecorator === 'function') {
                            resMeta = this.resDecorator(resMeta);
                        }

                        const content = await fsPromises.readFile(fullPath, 'utf8');
                        yield [resMeta, content];
                        L10nContext.logger.debug(`FsSource: Yielded resource ${id} from ${fullPath}`);
                    } catch (error) {
                        L10nContext.logger.error(`FsSource: Error processing file ${fullPath} (id: ${id}): ${error.message}`);
                        // Decide if we should skip, rethrow, or yield an error. Logging and skipping for now.
                    }
                }
            } catch (globError) {
                L10nContext.logger.error(`FsSource: Error during glob pattern processing "${globPattern}": ${globError.message}`);
            }
        }
        L10nContext.logger.info(`FsSource: Finished fetching all resources from ${this.baseDir}.`);
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
