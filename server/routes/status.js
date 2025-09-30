import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupStatusRoute(router, mm) {
    router.get('/status/:channelId', async (req, res) => {
        const { channelId } = req.params;
        logInfo`/status/${channelId}`;
        try {
            const status = await mm.getTranslationStatus(channelId);
            // channel -> source_lang -> target_lang -> project -> data
            logVerbose`Returned translation status`;
            res.json(status[channelId]);
        } catch (error) {
            console.error('Error fetching status: ', error);
            res.status(500).json({ message: 'Problems fetching status data' });
        }
    });

    router.get('/status/:channelId/:sourceLang/:targetLang', async (req, res) => {
        const { channelId, sourceLang, targetLang } = req.params;
        logInfo`/status/${channelId}/${sourceLang}/${targetLang}`;
        try {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const tus = await tm.getUntranslatedContent(channelId, 500);
            logVerbose`Returned ${tus.length} untranslated TUs for ${sourceLang}->${targetLang} in channel ${channelId}`;
            res.json(tus);
        } catch (error) {
            logInfo`Error: ${error.message}`;
            res.status(500).json({ error: error.message });
        }
    });
}
