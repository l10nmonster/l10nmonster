import * as fs from 'fs/promises';
import {js2tmx} from 'tmexchange';
import { flattenNormalizedSourceV1 } from '../normalizers/util.js';

async function exportTM(mm, targetLang, sourceLookup, all) {
    const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
    const getMangledSrc = tu => (tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src);
    const getMangledTgt = tu => (tu.ntgt ? flattenNormalizedSourceV1(tu.ntgt)[0] : tu.tgt);
    const tmx = {
        sourceLanguage: mm.sourceLang,
        resources: {},
    };
    for (const tu of Object.values(sourceLookup)) {
        const translatedTU = tm.getEntryByGuid(tu.guid);
        const mangledTgt = translatedTU !== undefined && getMangledTgt(translatedTU);
        if (all || Boolean(mangledTgt)) {
            const group = tu.prj || 'default';
            tmx.resources[group] ??= {};
            tmx.resources[group][tu.guid] = {};
            tmx.resources[group][tu.guid][mm.sourceLang] = getMangledSrc(tu);
            Boolean(mangledTgt) && (tmx.resources[group][tu.guid][targetLang] = mangledTgt);
        }
    }
    return tmx;
}

export async function tmExportCmd(mm, { limitToLang, all, format }) {
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
        const json = await exportTM(mm, targetLang, sourceLookup, all);
        if (format === 'json') {
            filename = `${mm.sourceLang}-${targetLang}.json`;
            await fs.writeFile(`${filename}`, JSON.stringify(json, null, '\t'), 'utf8');
        } else {
            filename = `${mm.sourceLang}-${targetLang}.tmx`;
            await fs.writeFile(`${filename}`, await js2tmx(json), 'utf8');
        }
        status.files.push(filename);
    }
    return status;
}
