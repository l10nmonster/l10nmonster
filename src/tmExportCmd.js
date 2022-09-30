import * as fs from 'fs/promises';
import {js2tmx} from '@l10nmonster/tmexchange';
import { flattenNormalizedSourceV1, cleanupTU } from './normalizers/util.js';
import { sourceTUWhitelist, targetTUWhitelist } from './schemas.js';

async function exportTMX(ctx, content, emitMissingTranslations) {
    const getMangledSrc = tu => (tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src);
    const getMangledTgt = tu => (tu.ntgt ? flattenNormalizedSourceV1(tu.ntgt)[0] : tu.tgt);
    const tmx = {
        sourceLanguage: content.sourceLang,
        resources: {},
    };
    for (const pair of content.pairs) {
        const mangledTgt = pair.translatedTU !== undefined && getMangledTgt(pair.translatedTU);
        // sometimes we lose the source and we can't recreate the pair anymore
        if (pair.sourceTU || (pair.translatedTU.src || pair.translatedTU.nsrc)) {
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
            ctx.logger.info(`Couldn't retrieve source for guid: ${pair.sourceTU.guid}`);
        }
    }
    return tmx;
}

async function exportAsJob(ctx, content, jobGuid) {
    const jobReq = {
        sourceLang: content.sourceLang,
        targetLang: content.targetLang,
        jobGuid,
        updatedAt: (ctx.regression ? new Date('2022-05-30T00:00:00.000Z') : new Date()).toISOString(),
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
        const useAsSourceTU = { ...pair.translatedTU, ...pair.sourceTU };
        if (useAsSourceTU.src || useAsSourceTU.nsrc) {
            jobReq.tus.push(cleanupTU(useAsSourceTU, sourceTUWhitelist));
        } else {
            ctx.logger.info(`Couldn't retrieve source for guid: ${useAsSourceTU.guid}`);
        }
        // we want to include source in target in case it's missing
        const useAsTargetTU = { ...pair.sourceTU, ...pair.translatedTU };
        if (useAsTargetTU.inflight) {
            ctx.logger.info(`Warning: in-flight translation unit ${useAsTargetTU.guid} can't be exported`);
        } else {
            const cleanTU = cleanupTU(useAsTargetTU, targetTUWhitelist);
            cleanTU.ts = cleanTU.ts || new Date().getTime();
            jobRes.tus.push(cleanTU);
        }
    }
    return [ jobReq, jobRes ];
}

export async function tmExportCmd(mm, { limitToLang, mode, format, prjsplit }) {
    const sourceLookup = await mm.source.getSourceAsTus();
    const targetLangs = await mm.source.getTargetLangs(limitToLang);
    const status = { files: [] };
    for (const targetLang of targetLangs) {
        const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
        const guidList = mode === 'tm' ? tm.guids : Object.keys(sourceLookup);
        const guidsByPrj = {};
        guidList.forEach(guid => {
            if (!prjsplit || !mm.ctx.prj || mm.ctx.prj.includes(mode === 'tm' ? tm.getEntryByGuid(guid).prj : sourceLookup[guid].prj)) { // either export everything or only content in the specified project
                const prj = (prjsplit && sourceLookup[guid]?.prj) || 'default';
                guidsByPrj[prj] ??= [];
                guidsByPrj[prj].push(guid);
            }
        });
        for (const prj of Object.keys(guidsByPrj)) {
            const content = {
                sourceLang: mm.sourceLang,
                targetLang,
                pairs: guidsByPrj[prj].map(guid => ({
                    sourceTU: sourceLookup[guid],
                    translatedTU: tm.getEntryByGuid(guid),
                })),
            };
            let filename;
            if (format === 'job') {
                const jobGuid = `tmexport_${prjsplit ? `${prj}_` : ''}${mm.sourceLang}_${targetLang}`;
                const [ jobReq, jobRes ] = await exportAsJob(mm.ctx, content, jobGuid);
                filename = `${mm.sourceLang}_${targetLang}_job_${jobGuid}`;
                await fs.writeFile(`${filename}-req.json`, JSON.stringify(jobReq, null, '\t'), 'utf8');
                await fs.writeFile(`${filename}-done.json`, JSON.stringify(jobRes, null, '\t'), 'utf8');
            } else if (format === 'json') {
                const json = await exportTMX(mm.ctx, content, mode !== 'tm');
                filename = `${prjsplit ? `${prj}_` : ''}${mm.sourceLang}_${targetLang}.json`;
                await fs.writeFile(`${filename}`, JSON.stringify(json, null, '\t'), 'utf8');
            } else {
                const json = await exportTMX(mm.ctx, content, mode !== 'tm');
                filename = `${prjsplit ? `${prj}_` : ''}${mm.sourceLang}_${targetLang}.tmx`;
                await fs.writeFile(`${filename}`, await js2tmx(json), 'utf8');
            }
            status.files.push(filename);
        }
    }
    return status;
}
