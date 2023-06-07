import {
    existsSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import { utils } from '@l10nmonster/helpers';

export default class SourceManager {
    constructor({ configSeal, contentTypes, snapStore, seqMapPath, seqThreshold }) {
        this.configSeal = configSeal;
        this.contentTypes = contentTypes;
        this.snapStore = snapStore;
        if (seqMapPath) {
            this.seqMapPath = seqMapPath;
            this.seqThreshold = seqThreshold ?? 7;
            if (existsSync(seqMapPath)) {
                this.seqMap = JSON.parse(readFileSync(seqMapPath, 'utf8'));
                let max = 0,
                    min = Number.MAX_SAFE_INTEGER;
                Object.values(this.seqMap).forEach(s => {
                    s > max && (max = s);
                    s < min && (min = s);
                });
                this.maxSeq = max;
                this.minSeq = min;
            } else {
                this.seqMap = {};
                this.maxSeq = 32 * 32 - 1;
                this.minSeq = 32 * 32;
            }
        }
    }

    async getResourceStatsFromAllSources() {
        l10nmonster.logger.info(`Getting resource stats from all sources...`);
        const combinedStats = [];
        for (const [ contentType, pipeline ] of Object.entries(this.contentTypes)) {
            const stats = await pipeline.source.fetchResourceStats();
            l10nmonster.logger.verbose(`Fetched resource stats for content type ${contentType}`);
            combinedStats.push(stats.map(res => ({ ...res, contentType })));
        }
        return combinedStats
            .flat(1)
            .filter(e => (l10nmonster.prj === undefined || l10nmonster.prj.includes(e.prj)));
    }

    async getResourceStats() {
        return this.snapStore ? this.snapStore.getResourceStats() : this.getResourceStatsFromAllSources();
    }

    // produce at least a 2-char label and try to assign shorter numbers to shorter strings
    #generateSequence(seg) {
        const seq = this.seqMap[seg.guid];
        if (seq) {
            return seq;
        } else {
            // eslint-disable-next-line no-nested-ternary
            const sl = (seg.nstr?.map(e => (typeof e === 'string' ? e : (e.t === 'x' ? '1234567' : '')))?.join('') ?? seg.str).length;
            const newSeq = sl <= this.seqThreshold && this.minSeq > 32 ? --this.minSeq : ++this.maxSeq;
            this.seqMap[seg.guid] = newSeq;
            return newSeq;
        }
    }

    async #getParsedResource(pipeline, resourceStat, resource) {
        let parsedRes = await pipeline.resourceFilter.parseResource({resource, isSource: true});
        const res = { ...resourceStat, segments: parsedRes.segments };
        parsedRes.targetLangs && (res.targetLangs = parsedRes.targetLangs);
        for (const seg of res.segments) {
            if (pipeline.decoders) {
                const normalizedStr = utils.getNormalizedString(seg.str, pipeline.decoders);
                if (normalizedStr[0] !== seg.str) {
                    seg.nstr = normalizedStr;
                }
            }
            const flattenStr = seg.nstr ? utils.flattenNormalizedSourceToOrdinal(seg.nstr) : seg.str;
            flattenStr !== seg.str && (seg.gstr = flattenStr);
            seg.guid = utils.generateFullyQualifiedGuid(res.id, seg.sid, flattenStr);
            this.seqMapPath && (seg.seq = this.#generateSequence(seg));
            if (typeof seg.notes === 'string') {
                seg.rawNotes = seg.notes;
                seg.notes = utils.extractStructuredNotes(seg.notes);
            }
            // populate ph samples from comments
            if (seg?.notes?.ph && seg.nstr) {
                for (const part of seg.nstr) {
                    if (part.t === 'x' && seg.notes.ph[part.v]?.sample !== undefined && part.s === undefined) {
                        part.s = seg.notes.ph[part.v].sample;
                    }
                }
            }
            Object.freeze(seg);
        }
        Object.freeze(res);
        return res;
    }

    async getResourceFromSource(resourceStat) {
        l10nmonster.logger.verbose(`Getting resource ${resourceStat.id}...`);
        const pipeline = this.contentTypes[resourceStat.contentType];
        const rawResource = await pipeline.source.fetchResource(resourceStat.id);
        return this.#getParsedResource(pipeline, resourceStat, rawResource);
    }

    async getResource(resourceStat) {
        return this.snapStore ? this.snapStore.getResource(resourceStat) : this.getResourceFromSource(resourceStat);
    }

    async *getAllResourcesFromSources() {
        l10nmonster.logger.info(`Getting all resources...`);
        for (const [ contentType, pipeline ] of Object.entries(this.contentTypes)) {
            if (pipeline.source.fetchAllResources) {
                for await (const [resourceStat, rawResource] of pipeline.source.fetchAllResources(l10nmonster.prj)) {
                    yield await this.#getParsedResource(pipeline, { ...resourceStat, contentType }, rawResource);
                }
            } else {
                const stats = await pipeline.source.fetchResourceStats();
                for (const rs of stats) {
                    if (l10nmonster.prj === undefined || l10nmonster.prj.includes(rs.prj)) {
                        yield await this.#getParsedResource(
                            pipeline,
                            { ...rs, contentType },
                            await pipeline.source.fetchResource(rs.id)
                        );
                    }
                }
            }
        }
    }

    async *getAllResources() {
        return this.snapStore ? yield* this.snapStore.getAllResources() : yield* this.getAllResourcesFromSources();
    }

    async shutdown() {
        if (this.seqMapPath) {
            this.seqMapPath && writeFileSync(this.seqMapPath, JSON.stringify(this.seqMap, null, '\t'), 'utf8');
        }
    }
}
