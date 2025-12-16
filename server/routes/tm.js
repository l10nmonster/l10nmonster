import { logInfo, logVerbose, logError } from '@l10nmonster/core';

// Helper function to process search terms - handles exact vs partial matching
function processSearchTerm(term) {
    if (!term) return undefined;
    
    // Check if term is surrounded by double quotes
    if (term.startsWith('"') && term.endsWith('"') && term.length >= 2) {
        // Extract the content inside quotes for exact match
        return term.slice(1, -1);
    }
    
    // Default partial match behavior
    return `%${term}%`;
}

export function setupTmRoutes(router, mm) {
    router.get('/tm/stats', async (req, res) => {
        logInfo`/tm/stats`;
        try {
            const availableLangPairs = (await mm.tmm.getAvailableLangPairs()).sort();
            logVerbose`Returned ${availableLangPairs.length} language pairs`;
            res.json(availableLangPairs);
        } catch (error) {
            logError`Error in /tm/stats: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get TM stats',
                message: error.message
            });
        }
    });

    router.get('/tm/stats/:sourceLang/:targetLang', async (req, res) => {
        logInfo`/tm/stats/${req.params.sourceLang}/${req.params.targetLang}`;
        try {
            const tm = mm.tmm.getTM(req.params.sourceLang, req.params.targetLang);
            const stats = await tm.getStats();
            logVerbose`Returned TM stats for ${req.params.sourceLang}->${req.params.targetLang}`;
            res.json(stats);
        } catch (error) {
            logError`Error in /tm/stats/${req.params.sourceLang}/${req.params.targetLang}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get TM stats for language pair',
                message: error.message
            });
        }
    });

    router.get('/tm/lowCardinalityColumns/:sourceLang/:targetLang', async (req, res) => {
        const { sourceLang, targetLang } = req.params;
        logInfo`/tm/lowCardinalityColumns/${sourceLang}/${targetLang}`;
        try {
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const data = await tm.getLowCardinalityColumns();
            logVerbose`Returned TM low cardinality columns for ${sourceLang}->${targetLang}`;
            res.json({ channel: mm.rm.channelIds, ...data });
        } catch (error) {
            logError`Error in /tm/lowCardinalityColumns/${sourceLang}/${targetLang}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to get low cardinality columns',
                message: error.message
            });
        }
    });
    router.get('/tm/search', async (req, res) => {
        logInfo`/tm/search`;
        try {
            const { sourceLang, targetLang, page, limit, guid, nid, jobGuid, rid, sid, channel, nsrc, ntgt, notes, tconf, q, translationProvider, onlyTNotes, active, minTS, maxTS } = req.query;
            const tm = mm.tmm.getTM(sourceLang, targetLang);
            const limitInt = limit ? parseInt(limit, 10) : 100;
            const pageInt = page ? parseInt(page, 10) : 1;
            const offset = (pageInt - 1) * limitInt;
            const data = await tm.search(offset, limitInt, {
                guid: processSearchTerm(guid),
                nid: processSearchTerm(nid),
                jobGuid: processSearchTerm(jobGuid),
                rid: processSearchTerm(rid),
                sid: processSearchTerm(sid),
                channel: processSearchTerm(channel),
                nsrc: processSearchTerm(nsrc),
                ntgt: processSearchTerm(ntgt),
                notes: processSearchTerm(notes),
                tconf: processSearchTerm(tconf),
                q,
                minTS,
                maxTS,
                translationProvider: processSearchTerm(translationProvider),
                onlyTNotes: onlyTNotes === '1',
                ...(active === '1' && { maxRank: 1 }),
            });
            logVerbose`Returned TM search results for ${data.length} entries`;
            res.json({ data, page: pageInt, limit: limitInt });
        } catch (error) {
            logError`Error in /tm/search: ${error.message}`;
            logVerbose`Stack trace: ${error.stack}`;
            res.status(500).json({
                error: 'Failed to search translation memory',
                message: error.message
            });
        }
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
            logError`Error fetching job ${req.params.jobGuid}: ${error.message}`;
            res.status(500).json({
                error: 'Failed to fetch job',
                message: error.message
            });
        }
    });

}
