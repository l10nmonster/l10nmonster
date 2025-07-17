export function setupActiveContentStatsRoute(router, mm) {
    router.get('/activeContentStats', async (req, res) => {
        const sources = {};
        for (const channelId of Object.keys(mm.rm.channels)) {
            const channelStats = await mm.rm.getActiveContentStats(channelId);
            sources[channelId] = channelStats;
        }
        res.json(sources);
    });
} 