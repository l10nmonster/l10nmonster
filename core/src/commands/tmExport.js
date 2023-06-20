import * as fs from 'fs/promises';
import {js2tmx} from '@l10nmonster/tmexchange';
import { utils } from '@l10nmonster/helpers';
import { TU } from '../entities/tu.js';

async function exportTMX(content, emitMissingTranslations) {
    const getMangledSrc = tu => utils.flattenNormalizedSourceV1(tu.nsrc)[0];
    const getMangledTgt = tu => utils.flattenNormalizedSourceV1(tu.ntgt)[0];
    const tmx = {
        sourceLanguage: content.sourceLang,
        resources: {},
    };
    for (const pair of content.pairs) {
        const mangledTgt = pair.translatedTU !== undefined && getMangledTgt(pair.translatedTU);
        // sometimes we lose the source and we can't recreate the pair anymore
        if (pair.sourceTU || pair.translatedTU.nsrc) {
            const useAsSourceTU = pair.sourceTU || pair.translatedTU;
            // if guid is source-based we emit the entry even if translation is missing
            if (emitMissingTranslations || Boolean(mangledTgt)) {
                const group = useAsSourceTU.prj || 'default';
                tmx.resources[group] ??= {};
                tmx.resources[group][pair.sourceTU.guid] = {};
                tmx.resources[group][pair.sourceTU.guid][content.sourceLang] = getMangledSrc(useAsSourceTU);
                Boolean(mangledTgt) && (tmx.resources[group][pair.sourceTU.guid][content.targetLang] = mangledTgt);
            }
        } else {
            l10nmonster.logger.info(`Couldn't retrieve source for guid: ${pair.sourceTU.guid}`);
        }
    }
    return tmx;
}

async function exportAsJob(content, jobGuid) {
    const jobReq = {
        sourceLang: content.sourceLang,
        targetLang: content.targetLang,
        jobGuid,
        updatedAt: (l10nmonster.regression ? new Date('2022-05-30T00:00:00.000Z') : new Date()).toISOString(),
        status: 'created',
        tus: [],
    };
    const jobRes = {
        ...jobReq,
        translationProvider: 'TMExport',
        status: 'done',
        tus: [],
    };
    for (const pair of content.pairs) {
        // sometimes we lose the source so we merge source and target hoping the target TU has a copy of the source
        try {
            jobReq.tus.push(TU.asSource({ ...pair.translatedTU, ...pair.sourceTU }));
        } catch (e) {
            l10nmonster.logger.info(e.stack ?? e);
        }
        // we want to include source in target in case it's missing
        if (pair.translatedTU.inflight) {
            l10nmonster.logger.info(`Warning: in-flight translation unit ${pair.translatedTU.guid} can't be exported`);
        } else {
            try {
                jobRes.tus.push(TU.asPair({ ...pair.sourceTU, ...pair.translatedTU }));
            } catch (e) {
                l10nmonster.logger.info(e.stack ?? e);
            }
        }
    }
    return [ jobReq, jobRes ];
}

export async function tmExportCmd(mm, { limitToLang, mode, format, prjsplit }) {
    const status = { files: [] };
    const sourceLookup = {};
    for await (const res of mm.rm.getAllResources()) {
        for (const seg of res.segments) {
            sourceLookup[seg.guid] = TU.fromSegment(res, seg);
        }
    }
    const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.jobStore.getAvailableLangPairs())
        .filter(pair => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const tm = await mm.tmm.getTM(sourceLang, targetLang);
        const guidList = mode === 'tm' ? tm.guids : Object.keys(sourceLookup);
        const guidsByPrj = {};
        guidList.forEach(guid => {
            if (!prjsplit || !l10nmonster.prj || l10nmonster.prj.includes(mode === 'tm' ? tm.getEntryByGuid(guid).prj : sourceLookup[guid].prj)) { // either export everything or only content in the specified project
                const prj = (prjsplit && sourceLookup[guid]?.prj) || 'default';
                guidsByPrj[prj] ??= [];
                guidsByPrj[prj].push(guid);
            }
        });
        for (const prj of Object.keys(guidsByPrj)) {
            const content = {
                sourceLang: sourceLang,
                targetLang,
                pairs: guidsByPrj[prj].map(guid => ({
                    sourceTU: sourceLookup[guid],
                    translatedTU: tm.getEntryByGuid(guid),
                })),
            };
            let filename;
            if (format === 'job') {
                const jobGuid = `tmexport_${prjsplit ? `${prj}_` : ''}${sourceLang}_${targetLang}`;
                const [ jobReq, jobRes ] = await exportAsJob(content, jobGuid);
                filename = `TMExport_${sourceLang}_${targetLang}_job_${jobGuid}`;
                await fs.writeFile(`${filename}-req.json`, JSON.stringify(jobReq, null, '\t'), 'utf8');
                await fs.writeFile(`${filename}-done.json`, JSON.stringify(jobRes, null, '\t'), 'utf8');
            } else if (format === 'json') {
                const json = await exportTMX(content, mode !== 'tm');
                filename = `${prjsplit ? `${prj}_` : ''}${sourceLang}_${targetLang}.json`;
                await fs.writeFile(`${filename}`, JSON.stringify(json, null, '\t'), 'utf8');
            } else {
                const json = await exportTMX(content, mode !== 'tm');
                filename = `${prjsplit ? `${prj}_` : ''}${sourceLang}_${targetLang}.tmx`;
                await fs.writeFile(`${filename}`, await js2tmx(json), 'utf8');
            }
            status.files.push(filename);
        }
    }
    return status;
}
