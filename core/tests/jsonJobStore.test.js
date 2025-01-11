// eslint-disable-next-line no-unused-vars
import { L10nContext } from '../src/l10nContext.js'; // this is only needed for internal initialization
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

import { stores } from '../index.js';

const jobGuid = "Tck5-ng7SdYfpEPe5FKEn";
const jobFilename = "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json";
const reqJobOutput = JSON.parse(readFileSync(`tests/artifacts/jobstore/${jobFilename}`, 'utf-8'));
const expectedLangPairOutput = [
    [
      "xrmVYwMMnXRzUR7s1-Pdk",
      {
        "status": "done",
        "done": "ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-done.json",
        "pending": "ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json",
        "req": "ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json"
      }
    ],
    [
      "Tck5-ng7SdYfpEPe5FKEn",
      {
        "status": "done",
        "done": "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-done.json",
        "req": "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json"
      }
    ]
];

suite('jsonJobStore tests', () => {
    const jsonJobStore = new stores.JsonJobStore({ jobsDir: 'tests/artifacts/jobstore' });
    test('getAvailableLangPairs', async () => {
        const out = await jsonJobStore.getAvailableLangPairs();
        assert.deepEqual(out, [["en", "it"]]);
    });
    test('getJobStatusByLangPair', async () => {
        const out = await jsonJobStore.getJobStatusByLangPair("en", "it");
        assert.deepEqual(out, expectedLangPairOutput);
    });
    test('getJobByHandle', async () => {
        const out = await jsonJobStore.getJobByHandle(jobFilename);
        assert.deepEqual(out, reqJobOutput);
    });
    test('getJob', async () => {
        const out = await jsonJobStore.getJob(jobGuid);
        const expectedOutput = JSON.parse(readFileSync(`tests/artifacts/jobstore/${jobFilename.replace("-req", "-done")}`, "utf-8"));
        assert.deepEqual(out, expectedOutput);
    });
    test('getJobRequestByHandle', async () => {
        const out = await jsonJobStore.getJobRequestByHandle(jobFilename);
        assert.deepEqual(out, reqJobOutput);
    });
    test('getJobRequest', async () => {
        const out = await jsonJobStore.getJobRequest(jobGuid);
        assert.deepEqual(out, reqJobOutput);
    });
});
