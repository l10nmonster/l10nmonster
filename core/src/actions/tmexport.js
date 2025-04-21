/* eslint-disable complexity */
import * as fs from 'fs/promises';

import { L10nContext, TU, utils, consoleLog } from '@l10nmonster/core';

export class tmexport {
    static help = {
        description: 'DEPRECATED -- export translation memory as a json job.',
        options: [
            [ '-l, --lang <language>', 'target language to export' ],
            [ '--filter <filter>', 'use the specified tu filter' ],
            [ '--prjsplit', 'split target files by project' ],
        ]
    };

    static async action(mm, options) {
        const prjsplit = options.prjsplit;
        consoleLog`TMEXPORT IS NOW DEPRECATED -- USE ${'tm syncup'} INSTEAD`;
        consoleLog`Exporting TM for ${options.lang ? options.lang : 'all languages'}...`;
        let tuFilterFunction;
        if (options.filter) {
            tuFilterFunction = mm.tuFilters[utils.fixCaseInsensitiveKey(mm.tuFilters, options.filter)];
            if (!tuFilterFunction) {
                throw `Couldn't find ${options.filter} tu filter`;
            }
        }
        const files = [];
        const desiredTargetLangs = new Set(await mm.getTargetLangs(options.lang));
        const availableLangPairs = await mm.tmm.getAvailableLangPairs();
        const desiredLangPairs = availableLangPairs.filter(pair => desiredTargetLangs.has(pair[1]));
        for (const [sourceLang, targetLang] of desiredLangPairs) {
            const tusByPrj = {};
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            let translationProvider;
            for (const job of tm.getAllJobs()) {
                const { jobProps, tus } = job;
                for (const tu of tus) {
                    jobProps?.translationProvider && (translationProvider = jobProps.translationProvider);
                    tu.translationProvider = translationProvider;
                    if (!tuFilterFunction || tuFilterFunction(tu)) {
                        // either export everything or only content in the specified project
                        if (!prjsplit || !L10nContext.prj || L10nContext.prj.includes(tu.prj)) {
                            const prj = (prjsplit && tu?.prj) || 'default';
                            tusByPrj[prj] ??= [];
                            tusByPrj[prj].push(tu);
                        }
                    }
                }
            }
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
                        L10nContext.logger.info(e.message ?? e);
                    }
                    if (tu.inflight) {
                        L10nContext.logger.info(`Warning: in-flight translation unit ${tu.guid} can't be exported`);
                    } else {
                        try {
                            jobRes.tus.push(TU.asTarget(tu));
                        } catch (e) {
                            L10nContext.logger.info(e.message ?? e);
                        }
                    }
                }
                const filename = `TMExport_${sourceLang}_${targetLang}_job_${jobGuid}`;
                await fs.writeFile(`${filename}-req.json`, JSON.stringify(jobReq, null, '\t'), 'utf8');
                await fs.writeFile(`${filename}-done.json`, JSON.stringify(jobRes, null, '\t'), 'utf8');
                files.push(filename);
            }
        }
        consoleLog`Generated files: ${files.join(', ')}`;
    }
}
