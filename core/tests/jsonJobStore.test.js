// import { L10nContext } from '../src/l10nContext.js'; // this is only needed for internal initialization
// import { suite, test } from 'node:test';
// import assert from 'node:assert/strict';
// import { readFileSync } from 'fs';

// import { stores } from '../index.js';

// const jobGuid = "Tck5-ng7SdYfpEPe5FKEn";
// const jobFilename = "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json";
// const reqJobOutput = JSON.parse(readFileSync(`./artifacts/jobstore/${jobFilename}`, 'utf-8'));
// const expectedLangPairOutput = [
//     [
//       "xrmVYwMMnXRzUR7s1-Pdk",
//       {
//         "status": "done",
//         "done": "ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-done.json",
//         "pending": "ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json",
//         "req": "ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json"
//       }
//     ],
//     [
//       "Tck5-ng7SdYfpEPe5FKEn",
//       {
//         "status": "done",
//         "done": "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-done.json",
//         "req": "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json"
//       }
//     ]
// ];

// suite('LegacyFileBasedTmStore tests', () => {
//     const legacyFileBasedTmStore = new stores.LegacyFileBasedTmStore({ jobsDir: './artifacts/jobstore' });
//     test('getJob', async () => {
//         const out = await legacyFileBasedTmStore.getJob(jobGuid);
//         const expectedOutput = JSON.parse(readFileSync(`./artifacts/jobstore/${jobFilename.replace("-req", "-done")}`, "utf-8"));
//         assert.deepEqual(out, expectedOutput);
//     });
// });
