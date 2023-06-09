import { utils } from '@l10nmonster/helpers';

export default class SourceManager {
    constructor({ configSeal, contentTypes, snapStore }) {
        this.configSeal = configSeal;
        this.contentTypes = contentTypes;
        this.snapStore = snapStore;
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

    async #getParsedResource(pipeline, resourceStat, resource) {
        let parsedRes = await pipeline.resourceFilter.parseResource({resource, isSource: true});
        const { segments, ...resourceHead } = parsedRes;
        const res = { ...resourceStat, ...resourceHead };
        res.segments = [];
        for (const rawSegment of segments) {
            const { str, notes, ...normalizedSeg } = rawSegment;
            normalizedSeg.nstr = utils.getNormalizedString(str, pipeline.decoders);
            normalizedSeg.gstr = utils.flattenNormalizedSourceToOrdinal(normalizedSeg.nstr);
            normalizedSeg.guid = utils.generateFullyQualifiedGuid(res.id, normalizedSeg.sid, normalizedSeg.gstr);
            if (typeof notes === 'string') {
                normalizedSeg.rawNotes = notes;
                normalizedSeg.notes = utils.extractStructuredNotes(notes);
            }
            // populate ph samples from comments
            if (normalizedSeg.notes?.ph) {
                for (const part of normalizedSeg.nstr) {
                    if (part.t === 'x' && normalizedSeg.notes.ph[part.v]?.sample !== undefined && part.s === undefined) {
                        part.s = normalizedSeg.notes.ph[part.v].sample;
                    }
                }
            }
            if (pipeline.segmentDecorators) {
                let decoratedSeg = normalizedSeg;
                for (const decorator of pipeline.segmentDecorators) {
                    decoratedSeg = decorator(decoratedSeg);
                    if (decoratedSeg === undefined) { // this basically means DNT (or more like "pretend this doesn't exist")
                        break;
                    }
                }
                if (decoratedSeg !== undefined) {
                    Object.freeze(decoratedSeg);
                    res.segments.push(decoratedSeg);
                }
            } else {
                Object.freeze(normalizedSeg);
                res.segments.push(normalizedSeg);
            }
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
    }
}
