import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupStatusRoute(router, mm) {
    router.get('/status', async (req, res) => {
        logInfo`/status`;
        try {
            const status = await mm.getTranslationStatus();
            
            // Transform the structure from:
            // source_lang -> target_lang -> channel -> project -> data
            // to:
            // channel -> project -> source_lang -> target_lang -> data
            const flippedStatus = {};
            let projectCount = 0;
            for (const [sourceLang, targetLangs] of Object.entries(status)) {
                for (const [targetLang, channels] of Object.entries(targetLangs)) {
                    for (const [channelId, projects] of Object.entries(channels)) {
                        projectCount++;
                        for (const [projectName, data] of Object.entries(projects)) {
                            // Initialize nested structure if it doesn't exist
                            flippedStatus[channelId] ??= {};
                            flippedStatus[channelId][projectName] ??= {};
                            flippedStatus[channelId][projectName][sourceLang] ??= {};
                            
                            // Set the data at the new location
                            flippedStatus[channelId][projectName][sourceLang][targetLang] = data;
                        }
                    }
                }
            }
            logVerbose`Returned translation status for ${projectCount} projects`;
            res.json(flippedStatus);
        } catch (error) {
            console.error('Error fetching status: ', error);
            res.status(500).json({ message: 'Problems fetching status data' });
        }
    });
} 