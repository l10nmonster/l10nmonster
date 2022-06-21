import * as path from 'path';
import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { generateFullyQualifiedGuid, makeTU } from './shared.js';
import { getNormalizedString, flattenNormalizedSourceToOrdinal } from './normalizers/util.js';

export default class SourceManager {
    constructor({ logger, prj, monsterDir, configSeal, contentTypes}) {
        this.logger = logger;
        this.prj = prj;
        this.configSeal = configSeal;
        this.contentTypes = contentTypes;
        this.sourceCachePath = path.join(monsterDir, 'sourceCache.json');
        existsSync(this.sourceCachePath) && (this.sourceCache = JSON.parse(readFileSync(this.sourceCachePath, 'utf8')));
        // negative logic to allow undefined properties
        !(this.sourceCache?.configSeal === configSeal) && (this.sourceCache = { sources: {} });
        this.sourceCacheStale = true; // check resource timestamps once
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
                        seg.contentType = res.contentType;
                    }
                    pipeline.segmentDecorator && (res.segments = pipeline.segmentDecorator(parsedRes.segments));
                    newCache.sources[res.id] = res;
                }
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
