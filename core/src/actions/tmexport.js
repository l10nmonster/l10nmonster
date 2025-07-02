/* eslint-disable complexity */
import * as fs from 'fs/promises';

import { getRegressionMode, logInfo, consoleLog } from '../l10nContext.js';
import { TU } from '../entities/tu.js';

export class tmexport {
    static help = {
        description: 'DEPRECATED -- export translation memory as a json job.',
        options: [
            [ '-l, --lang <language>', 'target language to export' ],
        ]
    };

    static async action(mm, options) {
        consoleLog`TMEXPORT IS NOW DEPRECATED -- USE ${'tm syncup'} INSTEAD`;
        consoleLog`Exporting TM for ${options.lang ? options.lang : 'all languages'}...`;
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
                    const prj = 'default';
                    tusByPrj[prj] ??= [];
                    tusByPrj[prj].push(tu);
                }
            }
            for (const [ prj, tus ] of Object.entries(tusByPrj)) {
                const jobGuid = `tmexport_${sourceLang}_${targetLang}`;
                const jobReq = {
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                    jobGuid,
                    updatedAt: (getRegressionMode() ? new Date('2022-05-30T00:00:00.000Z') : new Date()).toISOString(),
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
                        logInfo`${e.message ?? e}`;
                    }
                    if (tu.inflight) {
                        logInfo`Warning: in-flight translation unit ${tu.guid} can't be exported`;
                    } else {
                        try {
                            jobRes.tus.push(TU.asTarget(tu));
                        } catch (e) {
                            logInfo`${e.message ?? e}`;
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
