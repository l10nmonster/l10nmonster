import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupDispatcherRoutes(router, mm) {
    router.post('/dispatcher/createJobs', async (req, res) => {
        logInfo`/dispatcher/createJobs`;
        
        try {
            const { sourceLang, targetLang, tus, providerList } = req.body;
            
            // Validate required parameters
            if (!sourceLang || !targetLang || !tus || !providerList) {
                return res.status(400).json({
                    error: 'Missing required parameters: sourceLang, targetLang, tus, providerList'
                });
            }
            
            // Validate that tus is an array
            if (!Array.isArray(tus)) {
                return res.status(400).json({
                    error: 'tus must be an array'
                });
            }
            
            // Validate that providerList is an array
            if (!Array.isArray(providerList)) {
                return res.status(400).json({
                    error: 'providerList must be an array'
                });
            }
            
            logVerbose`Creating jobs for ${tus.length} TUs with providers: ${providerList.join(', ')}`;
            
            // Call the MonsterManager dispatcher
            const result = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus }, { providerList, skipQualityCheck: true, skipGroupCheck: true });
            
            logVerbose`Created ${result?.length || 0} jobs successfully`;
            res.json(result);
            
        } catch (error) {
            logInfo`Error creating jobs: ${error.message}`;
            res.status(500).json({
                error: 'Failed to create jobs',
                message: error.message
            });
        }
    });

    router.post('/dispatcher/startJobs', async (req, res) => {
        logInfo`/dispatcher/startJobs`;
        
        try {
            const { jobs, instructions } = req.body;
            
            // Validate required parameters
            if (!jobs || !Array.isArray(jobs)) {
                return res.status(400).json({
                    error: 'Missing or invalid jobs parameter (must be an array)'
                });
            }
            
            logVerbose`Starting ${jobs.length} jobs with instructions: ${instructions || 'none'}`;
            
            // Call the MonsterManager dispatcher
            const result = await mm.dispatcher.startJobs(jobs, { instructions });
            
            logVerbose`Started jobs, returned ${result?.length || 0} job statuses`;
            res.json(result);
            
        } catch (error) {
            logInfo`Error starting jobs: ${error.message}`;
            res.status(500).json({
                error: 'Failed to start jobs',
                message: error.message
            });
        }
    });
}