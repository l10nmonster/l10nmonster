import * as fs from 'fs/promises';

export async function tmxExportCmd(mm, limitToLang) {
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
        const tm = await mm.tmm.getTM(mm.sourceLang, targetLang);
        const filename = `${mm.sourceLang}-${targetLang}`;
        const [ json, tmx ] = await tm.exportTMX(sourceLookup);
        await fs.writeFile(`${filename}.json`, JSON.stringify(json, null, '\t'), 'utf8');
        await fs.writeFile(`${filename}.tmx`, tmx, 'utf8');
        status.files.push(filename);
    }
    return status;
}
