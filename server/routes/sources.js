import { logInfo, logVerbose, logWarn } from '@l10nmonster/core';

export function setupChannelRoutes(router, mm) {
    router.get('/channel/:channelId', async (req, res) => {
        const { channelId } = req.params;
        logInfo`/channel/${channelId}`;
        try {
            const { ts, store } = (await mm.rm.getChannelMeta(channelId)) ?? {};
            const projects = ts ? await mm.rm.getActiveContentStats(channelId) : [];
            logVerbose`Returned active content stats for ${projects.length} projects`;
            res.json({ ts, store, projects });
        } catch (error) {
            logWarn`Error in /channel/${channelId}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get channel data',
                message: error.message
            });
        }
    });
    router.get('/channel/:channelId/:prj', async (req, res) => {
        const { channelId, prj } = req.params;
        const { offset, limit } = req.query;
        logInfo`/channel/${channelId}/${prj} (offset=${offset}, limit=${limit})`;
        try {
            const projectTOC = await mm.rm.getProjectTOC(channelId, prj, offset, limit);
            logVerbose`Returned project TOC for ${prj} with ${projectTOC.length} resources`;
            res.json(projectTOC);
        } catch (error) {
            logWarn`Error in /channel/${channelId}/${prj}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get project TOC',
                message: error.message
            });
        }
    });
    router.get('/resource/:channelId', async (req, res) => {
        const { channelId } = req.params;
        const { rid } = req.query;
        logInfo`/resource/${channelId}/${rid}`;
        try {
            const resource = await mm.rm.getResourceHandle(channelId, rid, { keepRaw: true });
            logVerbose`Returned resource ${rid} with ${resource.segments.length} segments`;
            res.json(resource);
        } catch (error) {
            logWarn`Error in /resource/${channelId}/${rid}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get resource',
                message: error.message
            });
        }
    });
} 