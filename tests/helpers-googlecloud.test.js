const path = require('path');
const { stores } = require('@l10nmonster/helpers-googlecloud');
global.l10nmonster ??= {};
l10nmonster.baseDir = `${path.resolve('.')}/translators`;
l10nmonster.logger = { info: () => true, error: () => false };

const jobGuid = "Tck5-ng7SdYfpEPe5FKEn";
const jobFilename = "ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json";
const jobOutput = {"jobGuid": "Tck5-ng7SdYfpEPe5FKEn", "sourceLang": "en", "status": "created", "targetLang": "it", "translationProvider": "ModernMT", "tus": [{"guid": "Q6atGCxMzEiusRkN4mXARrkpqaaKAVq6CVlz7pIJ0DU", "rid": "en/guide.json", "sid": "title", "src": "Payments Testing Guide: Ensure Flawless Checkouts", "ts": 1668113179406}, {"guid": "ECdT6RLLNyRxTb7Xha6PIzytq2ZkS5g0asqUOYLcOHA", "rid": "en/guide.json", "sid": "p1", "src": "Payment gateways are the vital financial link between customer and business. You risk a lost sale if a customer encounters even a minor issue during checkout.", "ts": 1668113179406}, {"guid": "xBXWwysXeVHO7_OgWxL44qTu30PxrCkG_jkzAFp3JI4", "rid": "en/guide.json", "sid": "p2", "src": "Payment gateway testing mimics each step of the payment process to verify that connections, transactions, and paths for communications are working. Testers uncover issues that impact a seamless transaction and user experience.", "ts": 1668113179406}, {"guid": "SODQAQuKsgIFGvOgzCoAi85KGeIwHcvim4U59juXXnA", "rid": "en/guide.json", "sid": "p3", "src": "This guide provides a full overview of payments testing, from definitions to use cases to actionable testing scenarios.", "ts": 1668113179406}, {"guid": "Zu8-DRKyPbW3MHG62Mou1orfoGMLbhxvGviCSrnX4iU", "rid": "en/guide.json", "sid": "brand", "src": "Giant's guarantee", "ts": 1668113179406}], "updatedAt": "2023-05-20T15:26:03.522Z"};

describe ('gcsJobStore tests', () => {
    const expectedLangPairOutput = [
        [
          "xrmVYwMMnXRzUR7s1-Pdk",
          {
            "status": "done",
            "done": "jobs/ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-done.json",
            "pending": "jobs/ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-pending.json",
            "req": "jobs/ModernMTBatch_en_it_job_xrmVYwMMnXRzUR7s1-Pdk-req.json"
          }
        ],
        [
          "Tck5-ng7SdYfpEPe5FKEn",
          {
            "status": "done",
            "done": "jobs/ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-done.json",
            "req": "jobs/ModernMT_en_it_job_Tck5-ng7SdYfpEPe5FKEn-req.json"
          }
        ]
    ];
    const gcsJobStore = new stores.GCSJobStore({ bucketName: 'l10n-translations', bucketPrefix: 'jobs' });
    test.skip('getAvailableLangPairs', async () => {
        const out = await gcsJobStore.getAvailableLangPairs();
        expect(out).toMatchObject([["en", "it"]]);
    });    
    test.skip('getJobStatusByLangPair', async () => {
        const out = await gcsJobStore.getJobStatusByLangPair("en", "it");
        expect(out).toMatchObject(expectedLangPairOutput);
    });    
    test.skip('getJobByHandle', async () => {
        const out = await gcsJobStore.getJobByHandle(jobFilename);
        expect(out).toMatchObject(jobOutput);
    });    
    test.skip('getJob', async () => {
        const out = await gcsJobStore.getJob(jobGuid);
        const expectedOutput = {"sourceLang":"en","targetLang":"it","translationProvider":"ModernMT","jobGuid":"Tck5-ng7SdYfpEPe5FKEn","status":"done","tus":[{"guid":"Q6atGCxMzEiusRkN4mXARrkpqaaKAVq6CVlz7pIJ0DU","ts":1,"ntgt":["Guida ai **Payment Testing**: garantire check-out impeccabili"],"q":40,"cost":[51,true,51]},{"guid":"ECdT6RLLNyRxTb7Xha6PIzytq2ZkS5g0asqUOYLcOHA","ts":1,"ntgt":["I gateway di pagamento sono il collegamento finanziario vitale tra cliente e azienda. Rischi di perdere una vendita se un cliente incontra anche un problema minore durante il checkout."],"q":40,"cost":[158,true,158]},{"guid":"xBXWwysXeVHO7_OgWxL44qTu30PxrCkG_jkzAFp3JI4","ts":1,"ntgt":["Il test del gateway di pagamento imita ogni fase del processo di pagamento per verificare che le connessioni, le transazioni e i percorsi per le comunicazioni funzionino. I tester scoprono problemi che influiscono su una transazione e un'esperienza utente senza soluzione di continuità."],"q":40,"cost":[226,true,226]},{"guid":"SODQAQuKsgIFGvOgzCoAi85KGeIwHcvim4U59juXXnA","ts":1,"ntgt":["Questa guida fornisce una panoramica completa dei test dei pagamenti, dalle definizioni ai casi d'uso agli testing scenarios attuabili."],"q":40,"cost":[121,true,121]},{"guid":"Zu8-DRKyPbW3MHG62Mou1orfoGMLbhxvGviCSrnX4iU","ts":1,"ntgt":["Garanzia del Giant"],"q":40,"cost":[19,true,19]}],"taskName":"x","updatedAt":"2023-05-20T15:26:03.522Z"};
        expect(out).toMatchObject(expectedOutput);
    }, 150000);    
    test.skip('getJobRequestByHandle', async () => {
        const out = await gcsJobStore.getJobRequestByHandle(jobFilename);
        expect(out).toMatchObject(jobOutput);
    });    
    test('getJobRequest', async () => {
        const out = await gcsJobStore.getJobRequest(jobGuid);
        expect(out).toMatchObject(jobOutput);
    }, 150000);    
});
