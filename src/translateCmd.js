import { diffJson } from 'diff';

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const color = { red: '\x1b[31m', green: '\x1b[32m', reset: '\x1b[0m' };

export async function translateCmd(mm, { limitToLang, dryRun }) {
    const status = { generatedResources: {}, diff: {} };
    const resourceStats = await mm.fetchResourceStats();
    const targetLangs = mm.getTargetLangs(limitToLang, resourceStats);
    for (const targetLang of targetLangs) {
        const verbose = mm.verbose;
        const sourceLang = mm.sourceLang;
        const tm = await mm.tmm.getTM(sourceLang, targetLang);
        const translator = async function translate(rid, sid, src) {
            const guid = mm.generateFullyQualifiedGuid(rid, sid, src);
            const entry = tm.getEntryByGuid(guid);
            !entry && verbose && console.log(`Couldn't find ${sourceLang}_${targetLang} entry for ${rid}+${sid}+${src}`);
            return entry?.tgt; // don't fall back, let the caller deal with it
        };
        status.generatedResources[targetLang] = [];
        status.diff[targetLang] = {};
        for (const res of resourceStats) {
            if (res.targetLangs.includes(targetLang)) {
                const resourceId = res.id;
                const pipeline = mm.contentTypes[res.contentType];
                const resource = await pipeline.source.fetchResource(res.id);
                const translatedRes = await pipeline.resourceFilter.generateTranslatedResource({ resourceId, resource, targetLang, translator });
                const translatedResourceId = pipeline.target.translatedResourceId(targetLang, resourceId);
                if (dryRun) {
                    let currentRaw;
                    try {
                        currentRaw = await pipeline.target.fetchTranslatedResource(targetLang, resourceId);
                    } catch (e) {
                        verbose && console.log(`${targetLang}: Couldn't fetch translated resource ${translatedResourceId}`);
                    }
                    if (currentRaw) {
                        const currentParsed = await pipeline.resourceFilter.parseResource({ resource: currentRaw, isSource: false });
                        const currentFlattened = {};
                        currentParsed.segments.forEach(x => currentFlattened[x.sid] = x.str);
                        const newParsed = await pipeline.resourceFilter.parseResource({ resource: translatedRes, isSource: false });
                        const newFlattened = {};
                        newParsed.segments.forEach(x => newFlattened[x.sid] = x.str);
                        const diff = diffJson(currentFlattened, newFlattened)
                            .filter(x => x.added ?? x.removed)
                            .map(x => `${x.added ? `${color.green}+` : `${color.red}-`} ${x.value}${color.reset}`)
                            .join('');
                        diff && (status.diff[targetLang][translatedResourceId] = diff);
                    }
                } else {
                    await pipeline.target.commitTranslatedResource(targetLang, resourceId, translatedRes);
                    status.generatedResources[targetLang].push(translatedResourceId);
                }
            }
        }
    }
    return status;
}
