import * as fs from 'fs/promises';
import {js2tmx} from 'tmexchange';
import { nanoid } from 'nanoid';
import { flattenNormalizedSourceV1 } from '../normalizers/util.js';

async function exportTMX(mm, targetLang, sourceLookup, tmBased) {
    const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
    const getMangledSrc = tu => (tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src);
    const getMangledTgt = tu => (tu.ntgt ? flattenNormalizedSourceV1(tu.ntgt)[0] : tu.tgt);
    const tmx = {
        sourceLanguage: mm.sourceLang,
        resources: {},
    };
    const guidList = tmBased ? tm.guids : Object.keys(sourceLookup);
    for (const guid of guidList) {
        const sourceTU = sourceLookup[guid];
        const translatedTU = tm.getEntryByGuid(guid);
        const mangledTgt = translatedTU !== undefined && getMangledTgt(translatedTU);
        // sometimes we lose the source and we can't recreate the pair anymore
        if (sourceTU || (translatedTU.src || translatedTU.nsrc)) {
            const useAsSourceTU = sourceTU || translatedTU;
            // if guid is source-based we emit the entry even if translation is missing
            if (!tmBased || Boolean(mangledTgt)) {
                const group = useAsSourceTU.prj || 'default';
                tmx.resources[group] ??= {};
                tmx.resources[group][guid] = {};
                tmx.resources[group][guid][mm.sourceLang] = getMangledSrc(useAsSourceTU);
                Boolean(mangledTgt) && (tmx.resources[group][guid][targetLang] = mangledTgt);
            }
        } else {
            mm.verbose && console.error(`Couldn't retrieve source for guid: ${guid}`);
        }
    }
    return tmx;
}

const cleanupTU = (tu, whitelist) => Object.fromEntries(Object.entries(tu).filter(e => whitelist.includes(e[0])));
const sourceTUWhitelist = [ 'guid', 'rid', 'sid', 'contentType', 'src', 'nsrc', 'ts', 'prj', 'notes'];
const targetTUWhitelist = [ 'guid', 'q', 'src', 'nsrc', 'tgt', 'ngtg', 'ts', 'cost' ];
async function exportAsJob(mm, targetLang, sourceLookup, tmBased) {
    const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
    const jobReq = {
        sourceLang: mm.sourceLang,
        targetLang,
        jobGuid: mm.ctx.regression ? 'tmexport' : nanoid(),
        updatedAt: (mm.ctx.regression ? new Date('2022-05-30T00:00:00.000Z') : new Date()).toISOString(),
        status: 'created',
        tus: [],
    };
    const jobRes = {
        ...jobReq,
        translationProvider: 'TMExport',
        status: 'done',
    };
    const guidList = tmBased ? tm.guids : Object.keys(sourceLookup);
    for (const guid of guidList) {
        const sourceTU = sourceLookup[guid];
        const translatedTU = tm.getEntryByGuid(guid);
        // sometimes we lose the source so we merge source and target hoping the target TU has a copy of the source
        const useAsSourceTU = { ...translatedTU, ...sourceTU };
        if (useAsSourceTU.src || useAsSourceTU.nsrc) {
            jobReq.tus.push(cleanupTU(useAsSourceTU, sourceTUWhitelist));
        } else {
            mm.verbose && console.error(`Couldn't retrieve source for guid: ${guid}`);
        }
        // we want to include source in target in case it's missing
        const useAsTargetTU = { ...sourceTU, ...translatedTU };
        if (useAsTargetTU.inflight) {
            mm.verbose && console.error(`Warning: in-flight translation unit ${guid} can't be exported`);
        } else {
            jobRes.tus.push(cleanupTU(useAsTargetTU, targetTUWhitelist));
        }
    }
    return [ jobReq, jobRes ];
}

export async function tmExportCmd(mm, { limitToLang, mode, format }) {
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    const status = { files: [] };
    for (const targetLang of targetLangs) {
        const sourceLookup = {};
        for (const res of Object.values(mm.sourceCache)) {
            for (const seg of res.segments) {
                sourceLookup[seg.guid] = mm.makeTU(res, seg);
            }
        }
        let filename;
        if (format === 'job') {
            const [ jobReq, jobRes ] = await exportAsJob(mm, targetLang, sourceLookup, mode === 'tm');
            filename = `${mm.sourceLang}_${targetLang}_job_${jobReq.jobGuid}`;
            await fs.writeFile(`${filename}-req.json`, JSON.stringify(jobReq, null, '\t'), 'utf8');
            await fs.writeFile(`${filename}-done.json`, JSON.stringify(jobRes, null, '\t'), 'utf8');
        } else if (format === 'json') {
            const json = await exportTMX(mm, targetLang, sourceLookup, mode === 'tm');
            filename = `${mm.sourceLang}_${targetLang}.json`;
            await fs.writeFile(`${filename}`, JSON.stringify(json, null, '\t'), 'utf8');
        } else {
            const json = await exportTMX(mm, targetLang, sourceLookup, mode === 'tm');
            filename = `${mm.sourceLang}_${targetLang}.tmx`;
            await fs.writeFile(`${filename}`, await js2tmx(json), 'utf8');
        }
        status.files.push(filename);
    }
    return status;
}
