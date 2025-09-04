import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupStatusRoute(router, mm) {
    router.get('/status', async (req, res) => {
        logInfo`/status`;
        try {
            const status = await mm.getTranslationStatus();
            // source_lang -> target_lang -> channel -> project -> data
            logVerbose`Returned translation status`;
            res.json(status);
        } catch (error) {
            console.error('Error fetching status: ', error);
            res.status(500).json({ message: 'Problems fetching status data' });
        }
    });

    router.get('/status/:sourceLang/:targetLang', async (req, res) => {
        const { sourceLang, targetLang } = req.params;
        logInfo`/status/${sourceLang}/${targetLang}`;
        try {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const tus = tm.getUntranslatedContent();
            logVerbose`Returned ${tus.length} untranslated TUs for ${sourceLang}->${targetLang}`;
            res.json(tus);
        } catch (error) {
            logInfo`Error: ${error.message}`;
            res.status(500).json({ error: error.message });
        }
    });
} 