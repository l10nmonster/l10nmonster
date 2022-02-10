// this is similar to push, except that existing translations in resources but not in TM
// are assumed to be in sync with source and imported into the TM
export async function grandfatherCmd(mm, quality, limitToLang) {
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    const status = [];
    for (const targetLang of targetLangs) {
        const txCache = {};
        const jobRequest = await mm.prepareTranslationJob({ targetLang });
        const sources = [];
        const translations = [];
        for (const tu of jobRequest.tus) {
            if (!txCache[tu.rid]) {
                const resMeta = mm.sourceCache[tu.rid];
                const pipeline = mm.contentTypes[tu.contentType];
                const lookup = {};
                let resource;
                try {
                    // mm.verbose && console.log(`Getting ${tu.rid} for language ${targetLang}`);
                    resource = await pipeline.target.fetchTranslatedResource(targetLang, tu.rid);
                } catch (e) {
                    mm.verbose && console.log(`Couldn't fetch translated resource: ${e}`);
                } finally {
                    if (resource) {
                        const parsedResource = await pipeline.resourceFilter.parseResource({ resource, isSource: false });
                        parsedResource.segments.forEach(seg => lookup[seg.sid] = mm.makeTU(resMeta, seg));
                    }
                }
                txCache[tu.rid] = lookup;
            }
            const previousTranslation = txCache[tu.rid][tu.sid];
            if (previousTranslation !== undefined) {
                sources.push(tu);
                const translation = {
                    guid: tu.guid,
                    rid: tu.rid,
                    sid: tu.sid,
                    src: tu.src,
                    tgt: previousTranslation.src,
                    contentType: previousTranslation.contentType,
                    q: quality,
                };
                previousTranslation.nsrc && (translation.ntgt = previousTranslation.nsrc);
                tu.nsrc && (translation.nsrc = tu.nsrc);
                translations.push(translation);
            }
        }
        mm.verbose && console.log(`Grandfathering ${targetLang}... found ${jobRequest.tus.length} missing translations, of which ${translations.length} existing`);
        if (translations.length > 0) {
            // eslint-disable-next-line no-unused-vars
            const { tus, ...jobResponse } = jobRequest;
            jobRequest.tus = sources;
            jobResponse.tus = translations;
            jobResponse.status = 'done';
            jobResponse.translationProvider = 'Grandfather';
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
