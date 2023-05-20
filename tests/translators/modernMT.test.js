import { readFileSync } from 'fs';
import * as path from 'path';
import { ModernMT } from '../../src/translators/modernMT';
import { OpsMgr } from '../../src/opsMgr';

const getArtifact = filename => JSON.parse(readFileSync(path.join('tests', 'translators', 'artifacts', filename)));
const logger = { info: () => true, verbose: () => true };
ModernMT.prototype.ctx = {
    logger,
    opsMgr: new OpsMgr({ logger }),
    regression: true,
};
const glossary = {
    'Payments Testing': {
        'it': '**Payment Testing**'
    },
    'testing scenarios': {},
    'Giant': {},
};

describe('Modern MT translator', () => {
    const realtimeTranslator = new ModernMT({
        apiKey: 'x',
        quality: 40,
        glossary,
    });
    const batchTranslator = new ModernMT({
        apiKey: 'x',
        webhook: 'x',
        chunkFetcher: () => getArtifact('MMT-realtime-op0.json'),
        quality: 40,
        glossary,
    });
    ModernMT.prototype.ctx.opsMgr.registry.mmtTranslateChunkOp.callback = async function mockTranslateChunkOp() {
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
        const jobResponse = await batchTranslator.fetchTranslations(getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json'),
            getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json'));
        expect(jobResponse).toMatchObject(getArtifact('ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-done.json'));
    });
});
