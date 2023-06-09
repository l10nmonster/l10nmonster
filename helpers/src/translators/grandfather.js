import { utils } from '@l10nmonster/helpers';

// existing translations in resources but not in TM are assumed to be in sync
// with source and are const ed into the TM at the configured quality level
export class Grandfather {
    constructor({ quality }) {
        if (quality === undefined) {
            throw 'You must specify a quality property for Grandfather';
        }
        this.quality = quality;
    }

    async init(mm) {
        this.mm = mm;
    }

    async requestTranslations(jobRequest) {
        const { tus, ...jobResponse } = jobRequest;
        jobResponse.tus = [];
        const txCache = {};
        const resourceStats = Object.fromEntries((await this.mm.source.getResourceStats()).map(r => [r.id, r]));
        for (const tu of tus) {
            if (!txCache[tu.rid]) {
                const pipeline = this.mm.contentTypes[resourceStats[tu.rid].contentType];
                const lookup = {};
                try {
                    const resource = await pipeline.target.fetchTranslatedResource(jobRequest.targetLang, tu.rid);
                    const parsedResource = await pipeline.resourceFilter.parseResource({ resource, isSource: false });
                    for (const seg of parsedResource.segments) {
                        seg.nstr = utils.getNormalizedString(seg.str, pipeline.decoders);
                        lookup[seg.sid] = seg;
                    }
            } catch (e) {
                    l10nmonster.logger.info(`Couldn't fetch translated resource: ${e.stack ?? e}`);
                }
                txCache[tu.rid] = lookup;
            }
            const previousTranslation = txCache[tu.rid][tu.sid];
            if (previousTranslation !== undefined) {
                const previousTU = utils.makeTU(resourceStats[tu.rid], previousTranslation);
                if (utils.sourceAndTargetAreCompatible(tu.nsrc, previousTU.nsrc)) {
                    jobResponse.tus.push({
                        guid: tu.guid,
                        nsrc: tu.nsrc,
                        ntgt: previousTU.nsrc,
                        ts: previousTU.ts,
                        q: this.quality,
                    });
                } else {
                    l10nmonster.logger.verbose(`Grandfather: could not reuse previous ${jobRequest.targetLang} translation ${tu.rid} - ${tu.sid} as it's incompatible`);
                }
            }
        }
        jobResponse.status = 'done';
        l10nmonster.logger.info(`Grandfathering ${jobRequest.targetLang}... found ${tus.length} missing translations, of which ${jobResponse.tus.length} can be grandfathered`);
        return jobResponse;
    }

    // sync api only
    async fetchTranslations() {
        throw 'Grandfather is a synchronous-only provider';
    }

    async refreshTranslations(jobRequest) {
        const fullResponse = await this.requestTranslations(jobRequest);
        const reqTuMap = jobRequest.tus.reduce((p,c) => (p[c.guid] = c, p), {});
        return {
            ...fullResponse,
            tus: fullResponse.tus.filter(tu => !utils.normalizedStringsAreEqual(reqTuMap[tu.guid].ntgt, tu.ntgt)),
        };
    }
}
