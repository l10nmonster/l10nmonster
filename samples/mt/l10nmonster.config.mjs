import { L10nMonsterConfig, ChannelConfig, policies, adapters, providers } from '@l10nmonster/core';
import * as translated from '@l10nmonster/helpers-translated';
import * as json from '@l10nmonster/helpers-json';
import * as demo from '@l10nmonster/helpers-demo';

const glossary = {
    'Payments Testing': {
        'it': '**Payment Testing**'
    },
    'testing scenarios': {},
    'Giant': {},
};

export default new L10nMonsterConfig(import.meta.dirname)
    .channel(new ChannelConfig('local')
        .source(new adapters.FsSource({
            globs: ['en/*.json'],
            sourceLang: 'en',
        }))
        .resourceFilter(new json.i18next.Filter())
        .policy(policies.fixedTargets(['it'], 50))
        .target(new adapters.FsTarget({
            targetPath: (lang, resourceId) => resourceId.replace('en/', `${lang}/`),
        })))
    .provider(new providers.InternalLeverage())
    .provider(new providers.Repetition({
        qualifiedPenalty: 1,
        unqualifiedPenalty: 9,
    }))
    .provider(new providers.Grandfather({ quality: 70 }))
    .provider(new demo.providers.PigLatinizer({ quality: 1 }))
    .provider(new translated.providers.ModernMT({
        apiKey: process.env.MMT_API_KEY,
        quality: 40,
        maxCharLength: 1000,
        glossary,
    }))
    .provider(new translated.providers.ModernMT({
        apiKey: process.env.MMT_BATCH_API_KEY,
        webhook: process.env.MMT_BATCH_WEBHOOK,
        chunkFetcher: dummyChunkFetcher,
        quality: 40,
        maxCharLength: 1000,
        glossary,
    }));

async function dummyChunkFetcher({ jobGuid, chunk }) {
    return [
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
            "translation": "Il test del gateway di pagamento imita ogni fase del processo di pagamento per verificare che le connessioni, le transazioni e i percorsi per le comunicazioni funzionino. I tester scoprono problemi che influiscono su una transazione e un'esperienza utente senza soluzione di continuità.",
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
    ];
}

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

Then the chunk fetcher would similarly have to fetch the response from the GCS bucket.
*/
