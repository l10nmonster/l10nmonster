import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupActiveContentStatsRoute(router, mm) {
    router.get('/activeContentStats', async (req, res) => {
        logInfo`/activeContentStats`;
        const sources = {};
        for (const channelId of Object.keys(mm.rm.channels)) {
            const channelStats = await mm.rm.getActiveContentStats(channelId);
            sources[channelId] = channelStats;
        }
        logVerbose`Returned active content stats for ${Object.keys(sources).length} channels`;
        res.json(sources);
    });
} 