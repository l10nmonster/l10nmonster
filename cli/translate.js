/* eslint-disable no-nested-ternary */
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

async function compareToExisting(monsterManager, resHandle, targetLang, translatedRes) {
    let currentTranslations;
    let delta;
        const channel = monsterManager.rm.getChannel(resHandle.channel);
    try {
        currentTranslations = await channel.getExistingTranslatedResource(resHandle, targetLang);
        if (translatedRes) {
            // eslint-disable-next-line no-unused-vars
            const newTranslations = await channel.makeResourceHandleFromObject(resHandle)
                .loadResourceFromRaw(translatedRes, { isSource: false });
            delta = computeDelta(currentTranslations, newTranslations);
        }
    } catch (e) {
        l10nmonster.logger.verbose(`Couldn't fetch ${targetLang} resource for ${resHandle.channel}:${resHandle.id}: ${e.stack ?? e}`);
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

    static async action(monsterManager, options) {
        const mode = (options.mode ?? 'all').toLowerCase();
        console.log(`Generating translated resources for ${consoleColor.bright}${options.lang ? options.lang : 'all languages'}${consoleColor.reset}... (${mode} mode)`);
        const status = { generatedResources: {}, deleteResources: {} };
        const targetLangs = monsterManager.getTargetLangs(options.lang);
        const allResources = await monsterManager.rm.getAllResources({ keepRaw: true });
        for await (const resHandle of allResources) {
            for (const targetLang of targetLangs) {
                if (resHandle.targetLangs.includes(targetLang) && (l10nmonster.prj === undefined || l10nmonster.prj.includes(resHandle.prj))) {
                    const tm = await monsterManager.tmm.getTM(resHandle.sourceLang, targetLang);
                    const translatedRes = await resHandle.generateTranslatedRawResource(tm);
                    let bundleChanges, delta;
                    if (mode === 'delta' || mode === 'dryrun') {
                        [ bundleChanges, delta] = await compareToExisting(monsterManager, resHandle, targetLang, translatedRes)
                    }
                    if (mode === 'dryrun') {
                        printChanges(resHandle, targetLang, bundleChanges, delta);
                    // delta mode commits translations if segments have changed, or translations are new or deleted
                    } else if (mode === 'all' || bundleChanges === 'changed' || bundleChanges === 'new' || bundleChanges === 'deleted') {
                        status.generatedResources[targetLang] ??= [];
                        status.deleteResources[targetLang] ??= [];
                        const translatedResourceId = await monsterManager.rm.getChannel(resHandle.channel)
                            .commitTranslatedResource(targetLang, resHandle.id, translatedRes);
                        (translatedRes === null ? status.deleteResources : status.generatedResources)[targetLang].push(translatedResourceId);
                        l10nmonster.logger.verbose(`Committed translated resource: ${translatedResourceId}`);
                    } else {
                        console.log(`Delta mode skipped translation of bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`);
                    }
                }
            }
        }
        if (mode !== 'dryrun') {
            console.log('Translation commit summary:');
            for (const [lang, files] of Object.entries(status.generatedResources)) {
                console.log(`  - ${lang}: ${files.length} resources generated ${status.deleteResources[lang].length} deleted`);
            }
        }
    }
}
