import * as fs from 'fs/promises';

import { L10nContext, TU, utils } from '@l10nmonster/core';
import { consoleColor } from './shared.js';

export class tmexport {
    static help = {
        description: 'export translation memory as a json job.',
        options: [
            [ '-l, --lang <language>', 'target language to export' ],
            [ '--filter <filter>', 'use the specified tu filter' ],
            [ '--prjsplit', 'split target files by project' ],
        ]
    };

    static async action(monsterManager, options) {
        const prjsplit = options.prjsplit;
        console.log(`Exporting TM for ${consoleColor.bright}${options.lang ? options.lang : 'all languages'}${consoleColor.reset}...`);
        let tuFilterFunction;
        if (options.filter) {
            tuFilterFunction = monsterManager.tuFilters[utils.fixCaseInsensitiveKey(monsterManager.tuFilters, options.filter)];
            if (!tuFilterFunction) {
                throw `Couldn't find ${options.filter} tu filter`;
            }
        }
        const files = [];
        const desiredTargetLangs = new Set(monsterManager.getTargetLangs(options.lang));
        const availableLangPairs = (await monsterManager.tmm.getAvailableLangPairs())
            .filter(pair => desiredTargetLangs.has(pair[1]));
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tusByPrj = {};
            const tm = await monsterManager.tmm.getTM(sourceLang, targetLang);
            tm.guids.forEach(guid => {
                const tu = tm.getEntryByGuid(guid);
                if (!tuFilterFunction || tuFilterFunction(tu)) {
                    // either export everything or only content in the specified project
                    if (!prjsplit || !L10nContext.prj || L10nContext.prj.includes(tu.prj)) {
                        const prj = (prjsplit && tu?.prj) || 'default';
                        tusByPrj[prj] ??= [];
                        tusByPrj[prj].push(tu);
                    }
                }
            });
            for (const [ prj, tus ] of Object.entries(tusByPrj)) {
                const jobGuid = `tmexport_${prjsplit ? `${prj}_` : ''}${sourceLang}_${targetLang}`;
                const jobReq = {
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                    jobGuid,
                    updatedAt: (L10nContext.regression ? new Date('2022-05-30T00:00:00.000Z') : new Date()).toISOString(),
                    status: 'created',
                    tus: [],
                };
                const jobRes = {
                    ...jobReq,
                    translationProvider: 'TMExport',
                    status: 'done',
                    tus: [],
                };
                for (const tu of tus) {
                    try {
                        jobReq.tus.push(TU.asSource(tu));
                    } catch (e) {
                        L10nContext.logger.info(e.stack ?? e);
                    }
                    if (tu.inflight) {
                        L10nContext.logger.info(`Warning: in-flight translation unit ${tu.guid} can't be exported`);
                    } else {
                        try {
                            jobRes.tus.push(TU.asTarget(tu));
                        } catch (e) {
                            L10nContext.logger.info(e.stack ?? e);
                        }
                    }
                }
                const filename = `TMExport_${sourceLang}_${targetLang}_job_${jobGuid}`;
                await fs.writeFile(`${filename}-req.json`, JSON.stringify(jobReq, null, '\t'), 'utf8');
                await fs.writeFile(`${filename}-done.json`, JSON.stringify(jobRes, null, '\t'), 'utf8');
                files.push(filename);
            }
        }
        console.log(`Generated files: ${files.join(', ')}`);
    }
}
