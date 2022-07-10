import * as path from 'path';
import {
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    readdirSync,
    unlinkSync,
    statSync,
} from 'fs';
import YAML from 'yaml';
import { generateFullyQualifiedGuid, makeTU } from './shared.js';
import { getNormalizedString, flattenNormalizedSourceToOrdinal } from './normalizers/util.js';

function mangleResourceId(id) {
    return id.replaceAll('/', '$').replaceAll('\\', '$');
}

export default class SourceManager {
    constructor({ logger, prj, monsterDir, configSeal, contentTypes, sourceMirrorDir }) {
        this.logger = logger;
        this.prj = prj;
        this.configSeal = configSeal;
        this.contentTypes = contentTypes;
        this.sourceCachePath = path.join(monsterDir, 'sourceCache.json');
        existsSync(this.sourceCachePath) && (this.sourceCache = JSON.parse(readFileSync(this.sourceCachePath, 'utf8')));
        // negative logic to allow undefined properties
        !(this.sourceCache?.configSeal === configSeal) && (this.sourceCache = { sources: {} });
        this.sourceCacheStale = true; // check resource timestamps once
        if (sourceMirrorDir) {
            this.sourceMirrorDir = sourceMirrorDir;
            !existsSync(sourceMirrorDir) && mkdirSync(sourceMirrorDir, {recursive: true});
        }

    }

    async #fetchResourceStats() {
        const combinedStats = [];
        for (const [ contentType, handler ] of Object.entries(this.contentTypes)) {
            const stats = await handler.source.fetchResourceStats();
            this.logger.verbose(`Fetched resource stats for content type ${contentType}`);
            for (const res of stats) {
                res.contentType = contentType;
            }
            combinedStats.push(stats);
        }
        return combinedStats.flat(1);
    }

    async getEntries() {
        if (this.sourceCacheStale) {
            const newCache = { configSeal: this.configSeal, sources: {} };
            const stats = await this.#fetchResourceStats();
            let dirty = stats.length !== Object.keys(this.sourceCache.sources).length;
            for (const res of stats) {
                if (this.sourceCache.sources[res.id]?.modified === res.modified) {
                    newCache.sources[res.id] = this.sourceCache.sources[res.id];
                } else {
                    dirty = true;
                    const pipeline = this.contentTypes[res.contentType];
                    const payload = await pipeline.source.fetchResource(res.id);
                    let parsedRes = await pipeline.resourceFilter.parseResource({resource: payload, isSource: true});
                    res.segments = parsedRes.segments;
                    for (const seg of res.segments) {
                        if (pipeline.decoders) {
                            const normalizedStr = getNormalizedString(seg.str, pipeline.decoders);
                            if (normalizedStr[0] !== seg.str) {
                                seg.nstr = normalizedStr;
                            }
                        }
                        const flattenStr = seg.nstr ? flattenNormalizedSourceToOrdinal(seg.nstr) : seg.str;
                        flattenStr !== seg.str && (seg.gstr = flattenStr);
                        seg.guid = generateFullyQualifiedGuid(res.id, seg.sid, flattenStr);
                    }
                    pipeline.segmentDecorator && (res.segments = pipeline.segmentDecorator(parsedRes.segments));
                    newCache.sources[res.id] = res;
                }
            }
            if (this.sourceMirrorDir) {
                const mirror = this.sourceCache.mirror || {},
                    newMirror = {},
                    filesToKeep = [];
                let filesWritten = 0;
                for (const res of Object.values(newCache.sources)) {
                    const mangledPathname = path.join(this.sourceMirrorDir, `${mangleResourceId(res.id)}.yml`);
                    filesToKeep.push(mangledPathname);
                    const mirrorMtime = existsSync(mangledPathname) && statSync(mangledPathname)?.mtime?.toISOString();
                    const mirrorMeta = mirror[res.id];
                    if (!(mirrorMeta?.sourceMtime === res.modified) || !(mirrorMeta?.mirrorMtime === mirrorMtime)) {
                        const yml = YAML.stringify(Object.fromEntries(res.segments.map(s => [s.sid, s.gstr ?? s.str])), null, {
                            indent: 4,
                            collectionStyle: 'block',
                            doubleQuotedMinMultiLineLength: 80,
                            doubleQuotedAsJSON: true,
                        });
                        writeFileSync(mangledPathname, yml);
                        newMirror[res.id] = {
                            sourceMtime: res.modified,
                            mirrorMtime: statSync(mangledPathname).mtime.toISOString(),
                        }
                        dirty = true;
                        filesWritten++;
                    }

                }
                const filesToDelete = readdirSync(this.sourceMirrorDir, { withFileTypes: true })
                    .filter(d => d.isFile())
                    .map(d => path.join(this.sourceMirrorDir, d.name))
                    .filter(existingFile => !filesToKeep.includes(existingFile));
                if (filesToDelete.length > 0) {
                    filesToDelete.forEach(pathToDelete => unlinkSync(pathToDelete));
                    dirty = true;
                }
                dirty && this.logger.info(`Source mirror updated: ${filesWritten} files written, ${filesToDelete.length} files deleted`);
                newCache.mirror = newMirror;
            }
            if (dirty) {
                this.logger.info(`Updating ${this.sourceCachePath}...`);
                writeFileSync(this.sourceCachePath, JSON.stringify(newCache, null, '\t'), 'utf8');
                this.sourceCache = newCache;
            }
            this.sourceCacheStale = false;
        }
        return Object.entries(this.sourceCache.sources)
            // eslint-disable-next-line no-unused-vars
            .filter(([rid, res]) => (this.prj === undefined || this.prj.includes(res.prj)));
    }

    async getSourceAsTus() {
        const sourceLookup = {};
        const source = await this.getEntries();
        // eslint-disable-next-line no-unused-vars
        for (const [ rid, res ] of source) {
            for (const seg of res.segments) {
                sourceLookup[seg.guid] = makeTU(res, seg);
            }
        }
        return sourceLookup;
    }

    async getTargetLangs(limitToLang) {
        let langs = [];
        // eslint-disable-next-line no-unused-vars
        const resourceStats = (await this.getEntries()).map(([rid, res]) => res);
        for (const res of resourceStats) {
            for (const targetLang of res.targetLangs) {
                !langs.includes(targetLang) && langs.push(targetLang);
            }
        }
        if (limitToLang) {
            if (langs.includes(limitToLang)) {
                langs = [ limitToLang ];
            } else {
                throw `Invalid language: ${limitToLang}`;
            }
        }
        return langs;
    }
}
