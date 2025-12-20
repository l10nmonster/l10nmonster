import { logInfo, logVerbose, logWarn } from '@l10nmonster/core';

async function createJob(mm, sourceLang, targetLang, guids, provider) {
    logVerbose`Creating job with ${guids.length} TUs for provider ${provider}`;

    // Expand TUs from guids to full TU data
    const tm = mm.tmm.getTM(sourceLang, targetLang);
    const expandedTus = await tm.queryByGuids(guids);

    // Call the MonsterManager dispatcher with single provider
    const jobs = await mm.dispatcher.createJobs(
        { sourceLang, targetLang, tus: expandedTus },
        { providerList: [provider], skipQualityCheck: true, skipGroupCheck: true }
    );

    // Find the job for this provider (if accepted)
    const job = jobs.find(j => j.translationProvider === provider);

    if (!job) {
        logVerbose`Provider ${provider} did not accept any TUs`;
        return null;
    }

    return job;
}

export function setupDispatcherRoutes(router, mm) {
    router.post('/dispatcher/estimateJob', async (req, res) => {
        logInfo`/dispatcher/estimateJob`;

        try {
            const { sourceLang, targetLang, guids, provider } = req.body;

            // Validate required parameters
            if (!sourceLang || !targetLang || !guids || !provider) {
                return res.status(400).json({
                    error: 'Missing required parameters: sourceLang, targetLang, guids, provider'
                });
            }

            // Validate that guids is an array
            if (!Array.isArray(guids)) {
                return res.status(400).json({
                    error: 'guids must be an array'
                });
            }

            // Create job with provider
            const job = await createJob(mm, sourceLang, targetLang, guids, provider);

            if (!job) {
                return res.json(null);
            }

            // Return job with guids array instead of full tus to minimize payload
            const { tus: jobTus, ...jobWithoutTus } = job;
            const estimatedJob = {
                ...jobWithoutTus,
                guids: jobTus.map(tu => tu.guid)
            };

            logVerbose`Estimated job with ${estimatedJob.guids.length} TUs`;
            res.json(estimatedJob);
        } catch (error) {
            logWarn`Error estimating job: ${error.message}`;
            res.status(500).json({
                error: 'Failed to estimate job',
                message: error.message
            });
        }
    });

    router.post('/dispatcher/startJob', async (req, res) => {
        logInfo`/dispatcher/startJob`;

        try {
            const { sourceLang, targetLang, guids, provider, jobName, instructions } = req.body;

            // Validate required parameters
            if (!sourceLang || !targetLang || !guids || !provider) {
                return res.status(400).json({
                    error: 'Missing required parameters: sourceLang, targetLang, guids, provider'
                });
            }

            // Validate that guids is an array
            if (!Array.isArray(guids)) {
                return res.status(400).json({
                    error: 'guids must be an array'
                });
            }

            // Create job with provider
            const job = await createJob(mm, sourceLang, targetLang, guids, provider);

            if (!job) {
                return res.status(400).json({
                    error: `Provider ${provider} did not accept any TUs`
                });
            }

            // Start the job
            const result = await mm.dispatcher.startJobs([job], { jobName, instructions });

            logVerbose`Started job with name: ${jobName || 'none'} and instructions: ${instructions || 'none'}`;
            res.json(result);

        } catch (error) {
            logWarn`Error starting job: ${error.message}`;
            res.status(500).json({
                error: 'Failed to start job',
                message: error.message
            });
        }
    });
}