import { z } from 'zod';
import { McpTool, McpInputError, McpNotFoundError, McpProviderError, McpToolError } from './mcpTool.js';
import { TU } from '@l10nmonster/core';

async function createJobForProvider(mm, jobRequest, provider, sourceTUsCount, guids) {
    let assignedJobs;
    try {
        assignedJobs = await mm.dispatcher.createJobs(
            jobRequest,
            { providerList: [provider], skipGroupCheck: true, skipQualityCheck: true }
        );
    } catch (error) {
        throw new McpProviderError(`Provider "${provider}" rejected the job request`, {
            hints: [
                'Verify the provider supports the requested language pair and content type.',
                'Ensure provider credentials/configuration are valid.'
            ],
            details: { jobRequestSize: sourceTUsCount },
            cause: error
        });
    }

    const job = assignedJobs.find(j => j.translationProvider === provider);

    if (!job) {
        const rejectedJob = assignedJobs.find(j => !j.translationProvider);
        if (rejectedJob && rejectedJob.tus.length > 0) {
            throw new McpProviderError(`Provider "${provider}" did not accept any of the ${guids.length} translation units`, {
                hints: [
                    'Double-check language pair support.',
                    'Try a different provider or smaller batch size.'
                ],
                details: { rejectedGuids: rejectedJob.tus.map(tu => tu.guid) }
            });
        }
        throw new McpProviderError(`Failed to create job with provider "${provider}"`, {
            details: { assignedJobs: assignedJobs.length }
        });
    }

    return job;
}

function getTranslatedTUs(completedJob) {
    const inflightGuidsSet = new Set(completedJob.inflight || []);
    return completedJob.tus
        .filter(tu => tu.ntgt && !inflightGuidsSet.has(tu.guid))
        .map(tu => ({
            guid: tu.guid,
            rid: tu.rid,
            sid: tu.sid,
            nsrc: tu.nsrc,
            ntgt: tu.ntgt,
            q: tu.q,
            ts: tu.ts,
            translationProvider: tu.translationProvider || completedJob.translationProvider,
            jobGuid: completedJob.jobGuid
        }));
}

/**
 * MCP tool for translating source translation units by their GUIDs.
 * 
 * This tool creates a translation job, assigns it to a provider,
 * starts the job, and returns the translated TUs.
 */
export class TranslateTool extends McpTool {
    static metadata = {
        name: 'translate',
        description: `Translate source translation units (TUs) by their GUIDs using a specified provider.

This tool:
1. Fetches source TUs from the channel using the provided GUIDs
2. Creates a translation job with the fetched source TUs
3. Assigns the job to the specified translation provider
4. Starts the job (executes the translation)
5. Returns the translated TUs with their target text

The tool returns translated TUs with:
- guid: Same as source TU
- ntgt: Normalized target strings (array of strings)
- q: Quality score
- ts: Timestamp`,
        inputSchema: z.object({
            sourceLang: z.string()
                .describe('Source language code (e.g., "en-US")'),
            targetLang: z.string()
                .describe('Target language code (e.g., "es-419")'),
            channelId: z.string()
                .describe('Channel ID to fetch source TUs from'),
            provider: z.string()
                .describe('Translation provider ID to use for translation'),
            guids: z.array(z.string())
                .min(1)
                .describe('Array of TU GUIDs to translate'),
            instructions: z.string()
                .optional()
                .describe('Optional instructions for the translation provider')
        })
    };

    static async execute(mm, args) {
        const { sourceLang, targetLang, channelId, provider, guids, instructions } = args;

        const availableProviders = mm.dispatcher.providers?.map(p => p.id) ?? [];
        if (!availableProviders.includes(provider)) {
            throw new McpInputError(`Unknown translation provider "${provider}"`, {
                hints: [`Available providers: ${availableProviders.join(', ') || 'none registered'}`]
            });
        }

        let tm;
        try {
            tm = mm.tmm.getTM(sourceLang, targetLang);
        } catch (error) {
            throw new McpInputError(`Language pair ${sourceLang}→${targetLang} is not configured`, {
                hints: ['Check translation_status include=["coverage"] to list available language pairs.'],
                cause: error
            });
        }

        let fetchedTUs;
        try {
            fetchedTUs = await tm.queryByGuids(guids, channelId);
        } catch (error) {
            throw new McpToolError('Failed to fetch translation units by GUID', {
                code: 'FETCH_TUS_FAILED',
                details: { channelId, guidsCount: guids.length },
                cause: error
            });
        }

        if (!fetchedTUs || fetchedTUs.length === 0) {
            throw new McpNotFoundError(`No translation units found for the provided GUIDs in channel "${channelId}"`, {
                hints: [
                    'Ensure the GUIDs belong to the specified channel.',
                    'Call source_query with a WHERE clause on guid to inspect source content.'
                ],
                details: { missingGuids: guids }
            });
        }

        const sourceTUs = fetchedTUs.map(tu => {
            try {
                return TU.asSource(tu);
            } catch (error) {
                throw new McpToolError(`Failed to create source TU for guid ${tu.guid}`, {
                    code: 'SOURCE_TU_CONVERSION_FAILED',
                    details: { guid: tu.guid },
                    cause: error
                });
            }
        });

        // Create job with the source TUs
        const jobRequest = {
            sourceLang,
            targetLang,
            tus: sourceTUs
        };

        // Create jobs and assign to provider
        const job = await createJobForProvider(mm, jobRequest, provider, sourceTUs.length, guids);

        // Start the job
        let jobStatuses;
        try {
            jobStatuses = await mm.dispatcher.startJobs(
                [job],
                { instructions }
            );
        } catch (error) {
            throw new McpProviderError(`Failed to start job ${job.jobGuid}`, {
                hints: [
                    'Inspect provider logs or credentials.',
                    'Retry without instructions to rule out formatting issues.'
                ],
                details: { jobGuid: job.jobGuid },
                cause: error,
                retryable: true
            });
        }

        const jobStatus = jobStatuses.find(s => s.jobGuid === job.jobGuid);
        if (!jobStatus) {
            throw new McpProviderError(`Provider "${provider}" did not report status for job ${job.jobGuid}`, {
                retryable: true
            });
        }

        // Retrieve the job to get translated TUs
        let completedJob;
        try {
            completedJob = await mm.tmm.getJob(job.jobGuid);
        } catch (error) {
            throw new McpToolError(`Failed to load job ${job.jobGuid} after start`, {
                code: 'JOB_LOOKUP_FAILED',
                cause: error,
                retryable: true
            });
        }

        if (!completedJob) {
            throw new McpToolError(`Job ${job.jobGuid} not found after completion`, {
                code: 'JOB_MISSING',
                retryable: true
            });
        }

        // Extract translated TUs (those with ntgt, excluding inflight ones)
        // Use the inflight array from the job response to filter
        const translatedTUs = getTranslatedTUs(completedJob);

        return {
            jobGuid: completedJob.jobGuid,
            sourceLang: completedJob.sourceLang,
            targetLang: completedJob.targetLang,
            translationProvider: completedJob.translationProvider,
            status: completedJob.status,
            translatedCount: translatedTUs.length,
            inflightCount: completedJob.inflight?.length || 0,
            translatedTUs,
            inflightGuids: completedJob.inflight && completedJob.inflight.length > 0 ? completedJob.inflight : undefined
        };
    }
}

