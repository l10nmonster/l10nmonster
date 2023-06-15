const path = require('path');
const { stores } = require('@l10nmonster/helpers');
const { readFileSync, read } = require('fs');
global.l10nmonster ??= {};
l10nmonster.baseDir = `${path.resolve('.')}/translators`;
l10nmonster.logger = { info: () => true };

const jobGuid = "Tck5-ng7SdYfpEPe5FKEn";
const jobFilename = "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json";
const reqJobOutput = JSON.parse(readFileSync(`./translators/artifacts/${jobFilename}`, 'utf-8'));
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
describe ('jsonJobStore tests', () => {
    const jsonJobStore = new stores.JsonJobStore({ jobsDir: 'artifacts' });
    test('getAvailableLangPairs', async () => {
        const out = await jsonJobStore.getAvailableLangPairs();
        expect(out).toMatchObject([["en", "it"]]);
    });    
    test('getJobStatusByLangPair', async () => {
        const out = await jsonJobStore.getJobStatusByLangPair("en", "it");
        expect(out).toMatchObject(expectedLangPairOutput);
    });    
    test('getJobByHandle', async () => {
        const out = await jsonJobStore.getJobByHandle(jobFilename);
        expect(out).toMatchObject(reqJobOutput);
    });    
    test('getJob', async () => {
        const out = await jsonJobStore.getJob(jobGuid);
        const expectedOutput = JSON.parse(readFileSync(`./translators/artifacts/${jobFilename.replace("-req", "-done")}`, "utf-8"));
        expect(out).toMatchObject(expectedOutput);
    });    
    test('getJobRequestByHandle', async () => {
        const out = await jsonJobStore.getJobRequestByHandle(jobFilename);
        expect(out).toMatchObject(reqJobOutput);
    });    
    test('getJobRequest', async () => {
        const out = await jsonJobStore.getJobRequest(jobGuid);
        expect(out).toMatchObject(reqJobOutput);
    });    
});

