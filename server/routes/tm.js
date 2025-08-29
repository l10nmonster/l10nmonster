import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupTmRoutes(router, mm) {
    router.get('/tm/stats', async (req, res) => {
        logInfo`/tm/stats`;
        const tmInfo = {};
        const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
        for (const [sourceLang, targetLang] of availableLangPairs) {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            tmInfo[sourceLang] ??= {};
            tmInfo[sourceLang][targetLang] = tm.getStats();
        }
        logVerbose`Returned TM stats for ${Object.keys(tmInfo).length} lang pairs`;
        res.json(tmInfo);
    });

    router.get('/tm/search', async (req, res) => {
        logInfo`/tm/search`;
        const { sourceLang, targetLang, page, limit, guid, jobGuid, rid, sid, nsrc, ntgt, notes, q, translationProvider } = req.query;
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const limitInt = limit ? parseInt(limit, 10) : 100;
        const pageInt = page ? parseInt(page, 10) : 1;
        const offset = (pageInt - 1) * limitInt;
        const data = tm.search(offset, limitInt, {
            guid: guid && `%${guid}%`,
            jobGuid: jobGuid && `%${jobGuid}%`,
            rid: rid && `%${rid}%`,
            sid: sid && `%${sid}%`,
            nsrc: nsrc && `%${nsrc}%`,
            ntgt: ntgt && `%${ntgt}%`,
            notes: notes && `%${notes}%`,
            q,
            translationProvider: translationProvider && `%${translationProvider}%`,
        });
        logVerbose`Returned TM search results for ${data.length} entries`;
        res.json({ data, page: pageInt, limit: limitInt });
    });

    router.get('/tm/job/:jobGuid', async (req, res) => {
        logInfo`/tm/job/${req.params.jobGuid}`;
        
        try {
            const { jobGuid } = req.params;
            
            if (!jobGuid) {
                return res.status(400).json({
                    error: 'Missing jobGuid parameter'
                });
            }
            
            const job = await mm.tmm.getJob(jobGuid);
            
            if (!job) {
                return res.status(404).json({
                    error: 'Job not found',
                    jobGuid
                });
            }
            
            logVerbose`Returned job data for ${jobGuid}`;
            res.json(job);
            
        } catch (error) {
            logInfo`Error fetching job ${req.params.jobGuid}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to fetch job',
                message: error.message
            });
        }
    });
}
