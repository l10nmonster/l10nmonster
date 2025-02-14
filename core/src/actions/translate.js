/* eslint-disable no-nested-ternary */
import { L10nContext } from '@l10nmonster/core';
import { consoleColor } from './shared.js';

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
            const newTranslations = await channel.makeResourceHandleFromObject(resHandle)
                .loadResourceFromRaw(translatedRes, { isSource: false });
            delta = computeDelta(currentTranslations, newTranslations);
        }
    } catch (e) {
        L10nContext.logger.verbose(`Couldn't fetch ${targetLang} resource for ${resHandle.channel}:${resHandle.id}: ${e.stack ?? e}`);
    }
    const bundleChanges = currentTranslations ?
        (translatedRes ? (delta.length > 0 ? 'changed' : 'unchanged') : 'deleted') :
        (translatedRes ? 'new' : 'void');
    return [ bundleChanges, delta ];
}

function printChanges(resHandle, targetLang, bundleChanges, delta) {
    if (bundleChanges === 'changed') {
        console.log(`\n${consoleColor.yellow}Changed translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}${consoleColor.reset}`);
        for (const change of delta) {
            change.l !== undefined && console.log(`${consoleColor.red}- ${change.id}: ${change.l}${consoleColor.reset}`);
            change.r !== undefined && console.log(`${consoleColor.green}+ ${change.id}: ${change.r}${consoleColor.reset}`);
        }
    } else if (bundleChanges === 'new') {
        console.log(`\n${consoleColor.green}New translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}${consoleColor.reset}`);
    } else if (bundleChanges === 'deleted') {
        console.log(`\n${consoleColor.green}Deleted translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}${consoleColor.reset}`);
    }
}

function printSummary(response) {
    console.log('Translation summary:');
    for (const [lang, langStatus] of Object.entries(response.lang)) {
        const summary = {};
        for (const resourceStatus of langStatus.resourceStatus) {
            summary[resourceStatus.status] = (summary[resourceStatus.status] ?? 0) + 1;
        }
        console.log(`  - ${lang}: ${Object.entries(summary).sort().map(([k,v]) => `${k}(${v})`).join(', ')}`);
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
        ]
    };

    static async action(mm, options) {
        const mode = (options.mode ?? 'all').toLowerCase();
        console.log(`Generating translated resources for ${consoleColor.bright}${options.lang ? options.lang : 'all languages'}${consoleColor.reset}... (${mode} mode)`);
        const response = { lang: {} };
        const targetLangs = mm.getTargetLangs(options.lang);
        const allResources = await mm.rm.getAllResources({ keepRaw: true });
        for await (const resHandle of allResources) {
            for (const targetLang of targetLangs) {
                if (resHandle.targetLangs.includes(targetLang) && (L10nContext.prj === undefined || L10nContext.prj.includes(resHandle.prj))) {
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
                        L10nContext.logger.verbose(`Committed translated resource: ${translatedResourceId}`);
                    } else {
                        L10nContext.logger.verbose(`Delta mode skipped translation of bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`);
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
