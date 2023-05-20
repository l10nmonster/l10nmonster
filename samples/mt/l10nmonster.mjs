async function dummyChunkFetcher({ jobGuid, chunk, offset }) {
    return {
        offset,
        translations: [
            {
                "translation": "Guida ai<x1> test dei pagamenti</x1>: garantire check-out impeccabili",
                "characters": 51,
                "billedCharacters": 51,
                "billed": true
            },
            {
                "translation": "I gateway di pagamento sono il collegamento finanziario vitale tra cliente e azienda. Rischi di perdere una vendita se un cliente incontra anche un problema minore durante il checkout.",
                "characters": 158,
                "billedCharacters": 158,
                "billed": true
            },
            {
                "translation": "Il test del gateway di pagamento imita ogni fase del processo di pagamento per verificare che le connessioni, le transazioni e i percorsi per le comunicazioni funzionino. I tester scoprono problemi che influiscono su una transazione e un'esperienza utente senza soluzione di continuitÃ .",
                "characters": 226,
                "billedCharacters": 226,
                "billed": true
            },
            {
                "translation": "Questa guida fornisce una panoramica completa dei test dei pagamenti, dalle definizioni ai casi d'uso agli <x1>scenari di test</x1> attuabili.",
                "characters": 121,
                "billedCharacters": 121,
                "billed": true
            },
            {
                "translation": "Garanzia del<x1> gigante</x1>",
                "characters": 19,
                "billedCharacters": 19,
                "billed": true
            }
        ]
    };
}

export default class MTConfig {
    sourceLang = 'en';
    minimumQuality = 50;

    constructor({ ctx, adapters, filters, translators }) {
        const glossary = {
            'Payments Testing': {
                'it': '**Payment Testing**'
            },
            'testing scenarios': {},
            'Giant': {},
        };
        this.contentTypes = {
            local: {
                source: new adapters.FsSource({
                    globs: [ 'en/*.json' ],
                    targetLangs: [ 'it' ]
                }),
                resourceFilter: new filters.JsonFilter(),
                target: new adapters.FsTarget({
                    targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
                }),
            }
        };
        this.translationProviders = {
            Piggy: {
                translator: new translators.PigLatinizer({ quality: 1 }),
                pairs: { en: [ 'it' ]},
            },
            ModernMT: {
                translator: new translators.ModernMT({
                    apiKey: ctx.env.mmt_api_key,
                    quality: 40,
                    maxCharLength: 1000,
                    glossary,
                }),
            },
            ModernMTBatch: {
                translator: new translators.ModernMT({
                    apiKey: ctx.env.mmt_batch_api_key,
                    webhook: ctx.env.mmt_batch_webhook,
                    chunkFetcher: dummyChunkFetcher,
                    quality: 40,
                    maxCharLength: 1000,
                    glossary,
                }),
            },
            DeepL: {
                translator: new translators.DeepL({
                    apiKey: ctx.env.deepl_api_key,
                    quality: 40,
                }),
                quota: 0,
            },
            Repetition: {
                translator: new translators.Repetition({
                    qualifiedPenalty: 1,
                    unqualifiedPenalty: 9,
                }),
            },
            Grandfather: {
                translator: new translators.Grandfather({
                    quality: 70,
                }),
            },
        };
    }
}

export const opsDir = 'l10nOps';

/*
The MMT webhook needs to be implemented based on the available infrastructure.

For example, using a GCP Function to save the callback in GCS:

import { Storage } from '@google-cloud/storage';

export async function deliverTranslations(req, res) {
    const metadata = req.body.metadata ?? {};
    const storage = new Storage({});
    const fileHandle = await storage.bucket('l10n-MMT').file(`${metadata.jobGuid}-${metadata.chunk}.json`);
    await fileHandle.save(JSON.stringify(req.body.result ?? {}, null, 2));
    res.status(200).send('OK');
}
*/
