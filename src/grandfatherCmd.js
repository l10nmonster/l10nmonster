import { getNormalizedString, sourceAndTargetAreCompatible, flattenNormalizedSourceV1, extractNormalizedPartsV1 } from './normalizers/util.js';

// this is similar to push, except that existing translations in resources but not in TM
// are assumed to be in sync with source and imported into the TM
export async function grandfatherCmd(mm, quality, limitToLang) {
    const sourceCache = Object.fromEntries(await mm.source.getEntries());
    const targetLangs = await mm.source.getTargetLangs(limitToLang);
    const status = [];
    for (const targetLang of targetLangs) {
        const txCache = {};
        const jobRequest = await mm.prepareTranslationJob({ targetLang });
        jobRequest.translationProvider = 'Grandfather';
        const sources = [];
        const translations = [];
        for (const tu of jobRequest.tus) {
            if (!txCache[tu.rid]) {
                const resMeta = sourceCache[tu.rid];
                const pipeline = mm.contentTypes[tu.contentType];
                const lookup = {};
                let resource;
                try {
                    // mm.ctx.logger.info(`Getting ${tu.rid} for language ${targetLang}`);
                    resource = await pipeline.target.fetchTranslatedResource(targetLang, tu.rid);
                } catch (e) {
                    mm.ctx.logger.info(`Couldn't fetch translated resource: ${e}`);
                } finally {
                    if (resource) {
                        const parsedResource = await pipeline.resourceFilter.parseResource({ resource, isSource: false });
                        for (const seg of parsedResource.segments) {
                            if (pipeline.decoders) {
                                const normalizedStr = getNormalizedString(seg.str, pipeline.decoders);
                                if (normalizedStr[0] !== seg.str) {
                                    seg.nstr = normalizedStr;
                                }
                            }
                            lookup[seg.sid] = mm.makeTU(resMeta, seg);
                        }
                    }
                }
                txCache[tu.rid] = lookup;
            }
            const previousTranslation = txCache[tu.rid][tu.sid];
            if (previousTranslation !== undefined) {
                const translation = {
                    guid: tu.guid,
                    q: quality,
                };
                !tu.nsrc && (translation.src = tu.src);
                tu.nsrc && (translation.nsrc = tu.nsrc);
                if (previousTranslation.nsrc) {
                    const [ flattenSrc, phMap ] = flattenNormalizedSourceV1(previousTranslation.nsrc);
                    translation.ntgt = extractNormalizedPartsV1(flattenSrc, phMap);
                } else {
                    translation.tgt = previousTranslation.src;
                }
                previousTranslation.ts && (translation.ts = previousTranslation.ts);
                const isCompatible = sourceAndTargetAreCompatible(tu?.nsrc ?? tu?.src, translation?.ntgt ?? translation?.tgt);
                if (isCompatible) {
                    sources.push(tu);
                    translations.push(translation);
                }
            }
        }
        mm.ctx.logger.info(`Grandfathering ${targetLang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} existing`);
        if (translations.length > 0) {
            // eslint-disable-next-line no-unused-vars
            const { tus, ...jobResponse } = jobRequest;
            jobRequest.tus = sources;
            jobResponse.tus = translations;
            jobResponse.status = 'done';
            const manifest = await mm.jobStore.createJobManifest();
            await mm.processJob({ ...jobResponse, ...manifest, status: 'done' }, { ...jobRequest, ...manifest });
            status.push({
                num: translations.length,
                targetLang,
            });
        }
    }
    return status;
}
