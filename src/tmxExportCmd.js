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
        const filename = `${mm.sourceLang}-${targetLang}.tmx`;
        await fs.writeFile(filename, await tm.exportTMX(sourceLookup), 'utf8');
        status.files.push(filename);
    }
    return status;
}
