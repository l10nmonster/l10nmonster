// import path from 'path';
// import fs from 'fs';
// import translated from '@l10nmonster/helpers-translated';
// import { OpsMgr } from '@l10nmonster/core';

// const getArtifact = filename => JSON.parse(fs.readFileSync(path.join('translators', 'artifacts', filename)));

// global.l10nmonster ??= {};
// L10nContext.logger = { info: () => true, verbose: () => true };
// L10nContext.opsMgr = new OpsMgr();
// L10nContext.regression = true;

// const glossary = {
//     'Payments Testing': {
//         'it': '**Payment Testing**'
//     },
//     'testing scenarios': {},
//     'Giant': {},
// };

// suite('Modern MT translator', () => {
//     const realtimeTranslator = new translated.ModernMT({
//         apiKey: 'x',
//         quality: 40,
//         glossary,
//     });
//     const batchTranslator = new translated.ModernMT({
//         apiKey: 'x',
//         webhook: 'x',
//         chunkFetcher: () => getArtifact('MMT-realtime-op0.json'),
//         quality: 40,
//         glossary,
//     });
//     L10nContext.opsMgr.registry.mmtTranslateChunkOp.callback = async function mockTranslateChunkOp() {
//         // eslint-disable-next-line no-invalid-this
//         return this.opList[1].opName === 'mmtMergeTranslatedChunksOp' ?
//             getArtifact('MMT-realtime-op0.json') :
//             { "enqueued": true };
//     }

//     test('realtime requestTranslations returns done jobResponse', async () => {
//         const jobResponse = await realtimeTranslator.requestTranslations(getArtifact('ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json'));
//         assert.equal(jobResponse, getArtifact('ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-done.json'));
//     });

//     test('batch requestTranslations returns pending jobResponse', async () => {
//         const jobResponse = await batchTranslator.requestTranslations(getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json'));
//         assert.equal(jobResponse, getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json'));
//     });

//     // test('batch fetchTranslations returns done jobResponse', async () => {
//     //     const jobResponse = await batchTranslator.fetchTranslations(
//     //         getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json'),
//     //         getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json')
//     //     );
//     //     assert.equal(jobResponse, getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-done.json'));
//     // });
// });
