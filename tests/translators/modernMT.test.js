const path = require('path');
const fs = require('fs');
const translated = require('@l10nmonster/helpers-translated');
const { OpsMgr } = require('@l10nmonster/core');

const getArtifact = filename => JSON.parse(fs.readFileSync(path.join('translators', 'artifacts', filename)));

global.l10nmonster ??= {};
l10nmonster.logger = { info: () => true, verbose: () => true };
l10nmonster.opsMgr = new OpsMgr();
l10nmonster.regression = true;

const glossary = {
    'Payments Testing': {
        'it': '**Payment Testing**'
    },
    'testing scenarios': {},
    'Giant': {},
};

describe('Modern MT translator', () => {
    const realtimeTranslator = new translated.ModernMT({
        apiKey: 'x',
        quality: 40,
        glossary,
    });
    const batchTranslator = new translated.ModernMT({
        apiKey: 'x',
        webhook: 'x',
        chunkFetcher: () => getArtifact('MMT-realtime-op0.json'),
        quality: 40,
        glossary,
    });
    l10nmonster.opsMgr.registry.mmtTranslateChunkOp.callback = async function mockTranslateChunkOp() {
        // eslint-disable-next-line no-invalid-this
        return this.opList[1].opName === 'mmtMergeTranslatedChunksOp' ?
            getArtifact('MMT-realtime-op0.json') :
            { "enqueued": true };
    }

    test('realtime requestTranslations returns done jobResponse', async () => {
        const jobResponse = await realtimeTranslator.requestTranslations(getArtifact('ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json'));
        expect(jobResponse).toMatchObject(getArtifact('ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-done.json'));
    });

    test('batch requestTranslations returns pending jobResponse', async () => {
        const jobResponse = await batchTranslator.requestTranslations(getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json'));
        expect(jobResponse).toMatchObject(getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json'));
    });

    test('batch fetchTranslations returns done jobResponse', async () => {
        const jobResponse = await batchTranslator.fetchTranslations(
            getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json'),
            getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json')
        );
        expect(jobResponse).toMatchObject(getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-done.json'));
    });
});
