/* eslint-disable no-nested-ternary */
import { consoleLog, logVerbose } from '../l10nContext.js';

function computeDelta(currentTranslations, newTranslations) {
    const delta = [];
    const newGstrMap = Object.fromEntries(newTranslations.segments.map(seg => [ seg.sid, seg.gstr ]));
    const seenIds = new Set();
    for (const seg of currentTranslations.segments) {
        seenIds.add(seg.sid);
        const newGstr = newGstrMap[seg.sid];
        if (seg.gstr !== newGstr) {
            delta.push({ id: seg.sid, l: seg.gstr, r: newGstr });
        }
    }
    newTranslations.segments.filter(seg => !seenIds.has(seg.sid)).forEach(seg => delta.push({ id: seg.sid, r: seg.gstr }));
    return delta;
}

async function compareToExisting(mm, resHandle, targetLang, translatedRes) {
    let currentTranslations;
    let delta;
    const channel = mm.rm.getChannel(resHandle.channel);
    try {
        currentTranslations = await channel.getExistingTranslatedResource(resHandle, targetLang);
        if (translatedRes) {
            const newTranslations = await channel.makeResourceHandleFromHeader(resHandle)
                .loadResourceFromRaw(translatedRes, { isSource: false });
            delta = computeDelta(currentTranslations, newTranslations);
        }
    } catch (e) {
        logVerbose`Couldn't fetch ${targetLang} resource for ${resHandle.channel}:${resHandle.id}: ${e.message ?? e}`;
    }
    const bundleChanges = currentTranslations ?
        (translatedRes ? (delta.length > 0 ? 'changed' : 'unchanged') : 'deleted') :
        (translatedRes ? 'new' : 'void');
    return [ bundleChanges, delta ];
}

function printChanges(resHandle, targetLang, bundleChanges, delta) {
    if (bundleChanges === 'changed') {
        consoleLog`\nChanged translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`;
        for (const change of delta) {
            change.l !== undefined && consoleLog`- ${change.id}: ${change.l}`;
            change.r !== undefined && consoleLog`+ ${change.id}: ${change.r}`;
        }
    } else if (bundleChanges === 'new') {
        consoleLog`\nNew translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`;
    } else if (bundleChanges === 'deleted') {
        consoleLog`\nDeleted translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`;
    }
}

function printSummary(response) {
    consoleLog`Translation summary:`;
    for (const [lang, langStatus] of Object.entries(response.lang)) {
        const summary = {};
        for (const resourceStatus of langStatus.resourceStatus) {
            summary[resourceStatus.status] = (summary[resourceStatus.status] ?? 0) + 1;
        }
        consoleLog`  - ${lang}: ${Object.entries(summary).sort().map(([k,v]) => `${k}(${v})`).join(', ')}`;
    }
}

export class translate {
    static help = {
        description: 'generate translated resources based on latest source and translations.',
        arguments: [
            [ '[mode]', 'commit all/changed/none of the translations', ['all', 'delta', 'dryrun'] ],
        ],
        options: [
            [ '-l, --lang <language>', 'target language to translate' ],
            [ '-c, --channel <channel1,...>', 'limit translations to specified channels' ],
            [ '-p, --prj <prj1,...>', 'limit translations to specified projects' ],
        ]
    };

    static async action(mm, options) {
        const mode = (options.mode ?? 'all').toLowerCase();
        const channel = options.channel ? (Array.isArray(options.channel) ? options.channel : options.channel.split(',')) : undefined;
        const prj = options.prj ? (Array.isArray(options.prj) ? options.prj : options.prj.split(',')) : undefined;
        consoleLog`Generating translated resources for ${options.lang ? options.lang : 'all languages'}... (${mode} mode)`;
        const response = { lang: {} };
        const targetLangs = await mm.getTargetLangs(options.lang);
        const allResources = await mm.rm.getAllResources({ keepRaw: true, channel, prj });
        for await (const resHandle of allResources) {
            for (const targetLang of targetLangs) {
                if (resHandle.targetLangs.includes(targetLang)) {
                    const resourceStatus = { id: resHandle.id };
                    const tm = mm.tmm.getTM(resHandle.sourceLang, targetLang);
                    const translatedRes = await resHandle.generateTranslatedRawResource(tm);
                    let bundleChanges, delta;
                    if (mode === 'delta' || mode === 'dryrun') {
                        [ bundleChanges, delta ] = await compareToExisting(mm, resHandle, targetLang, translatedRes);
                        resourceStatus.status = bundleChanges;
                        resourceStatus.delta = delta;
                    }
                    if (mode === 'dryrun') {
                        printChanges(resHandle, targetLang, bundleChanges, delta);
                    // delta mode commits translations if segments have changed, or translations are new or deleted
                    } else if (mode === 'all' || bundleChanges === 'changed' || bundleChanges === 'new' || bundleChanges === 'deleted') {
                        const translatedResourceId = await mm.rm.getChannel(resHandle.channel)
                            .commitTranslatedResource(targetLang, resHandle.id, translatedRes);
                        resourceStatus.status = translatedRes === null ? 'deleted' : 'generated';
                        resourceStatus.translatedId = translatedResourceId;
                        logVerbose`Committed translated resource: ${translatedResourceId}`;
                    } else {
                        logVerbose`Delta mode skipped translation of bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`;
                        resourceStatus.status = 'skipped';
                    }
                    response.lang[targetLang] ??= { resourceStatus: []};
                    response.lang[targetLang].resourceStatus.push(resourceStatus);
                }
            }
        }
        printSummary(response);
        return response;
    }
}
