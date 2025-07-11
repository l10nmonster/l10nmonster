// const fs = require('fs/promises');
// const { js2tmx } = require('@l10nmonster/tmexchange');
// const { TU, utils } = require('@l10nmonster/core');


// async function exportTMX(content, emitMissingTranslations) {
//     const getMangledSrc = tu => utils.flattenNormalizedSourceV1(tu.nsrc)[0];
//     const getMangledTgt = tu => utils.flattenNormalizedSourceV1(tu.ntgt)[0];
//     const tmx = {
//         sourceLanguage: content.sourceLang,
//         resources: {},
//     };
//     for (const pair of content.pairs) {
//         const mangledTgt = pair.translatedTU !== undefined && getMangledTgt(pair.translatedTU);
//         // sometimes we lose the source and we can't recreate the pair anymore
//         if (pair.sourceTU || pair.translatedTU.nsrc) {
//             const useAsSourceTU = pair.sourceTU || pair.translatedTU;
//             // if guid is source-based we emit the entry even if translation is missing
//             if (emitMissingTranslations || Boolean(mangledTgt)) {
//                 const group = useAsSourceTU.prj || 'default';
//                 tmx.resources[group] ??= {};
//                 tmx.resources[group][pair.sourceTU.guid] = {};
//                 tmx.resources[group][pair.sourceTU.guid][content.sourceLang] = getMangledSrc(useAsSourceTU);
//                 Boolean(mangledTgt) && (tmx.resources[group][pair.sourceTU.guid][content.targetLang] = mangledTgt);
//             }
//         } else {
//             L10nContext.logger.info(`Couldn't retrieve source for guid: ${pair.sourceTU.guid}`);
//         }
//     }
//     return tmx;
// }

// async function tmExportCmd(mm, { limitToLang, mode, format, prjsplit }) {
//     const status = { files: [] };
//     const sourceLookup = {};
//     for await (const res of mm.rm.getAllResources()) {
//         for (const seg of res.segments) {
//             sourceLookup[seg.guid] = TU.fromSegment(res, seg);
//         }
//     }
//     const desiredTargetLangs = new Set(await mm.getTargetLangs(limitToLang));
//     const availableLangPairs = (await mm.jobStore.getAvailableLangPairs())
//         .filter(pair => desiredTargetLangs.has(pair[1]));
//     for (const [sourceLang, targetLang] of availableLangPairs) {
//         const tm = await mm.tmm.getTM(sourceLang, targetLang);
//         const guidList = mode === 'tm' ? tm.guids : Object.keys(sourceLookup);
//         const guidsByPrj = {};
//         guidList.forEach(guid => {
//             if (!prjsplit || !L10nContext.prj || L10nContext.prj.includes(mode === 'tm' ? tm.getEntryByGuid(guid).prj : sourceLookup[guid].prj)) { // either export everything or only content in the specified project
//                 const prj = (prjsplit && sourceLookup[guid]?.prj) || 'default';
//                 guidsByPrj[prj] ??= [];
//                 guidsByPrj[prj].push(guid);
//             }
//         });
//         for (const prj of Object.keys(guidsByPrj)) {
//             const content = {
//                 sourceLang: sourceLang,
//                 targetLang,
//                 pairs: guidsByPrj[prj].map(guid => ({
//                     sourceTU: sourceLookup[guid],
//                     translatedTU: tm.getEntryByGuid(guid),
//                 })),
//             };
//             let filename;
//             if (format === 'json') {
//                 const json = await exportTMX(content, mode !== 'tm');
//                 filename = `${prjsplit ? `${prj}_` : ''}${sourceLang}_${targetLang}.json`;
//                 await fs.writeFile(`${filename}`, JSON.stringify(json, null, '\t'), 'utf8');
//             } else {
//                 const json = await exportTMX(content, mode !== 'tm');
//                 filename = `${prjsplit ? `${prj}_` : ''}${sourceLang}_${targetLang}.tmx`;
//                 await fs.writeFile(`${filename}`, await js2tmx(json), 'utf8');
//             }
//             status.files.push(filename);
//         }
//     }
//     return status;
// }

// module.exports = class tmxexport {
//     static help = {
//         description: 'export source or translation memory as a TMX or plain json file.',
//         arguments: [
//             [ '<mode>', 'export source (including untranslated) or tm entries (including missing in source)', ['source', 'tm'] ],
//             [ '<format>', 'exported file format', ['tmx', 'json'] ],
//         ],
//         options: [
//             [ '-l, --lang <language>', 'target language to export' ],
//             [ '--prjsplit', 'split target files by project' ],
//         ]
//     };

//     static async action(monsterManager, options) {
//         const format = options.format;
//         const mode = options.mode;
//         const limitToLang = options.lang;
//         const prjsplit = options.prjsplit;
//         if (['json', 'tmx'].includes(format)) {
//             if (['source', 'tm'].includes(mode)) {
//                 console.log(`Exporting TM in mode ${consoleColor.bright}${mode}${consoleColor.reset} and format ${consoleColor.bright}${format}${consoleColor.reset} for ${consoleColor.bright}${limitToLang ? limitToLang : 'all languages'}${consoleColor.reset}...`);
//                 const status = await tmExportCmd(monsterManager, { limitToLang, mode, format, prjsplit });
//                 console.log(`Generated files: ${status.files.join(', ')}`);
//             } else {
//                 console.error('Invalid mode');
//             }
//         } else {
//             console.error('Invalid export format');
//         }
//     }
// };
