import { z } from 'zod';
import { McpTool } from './BaseMcpTool.js';
import { TU } from '@l10nmonster/core';

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

        // Fetch source TUs from the channel using the GUIDs
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const fetchedTUs = await tm.queryByGuids(guids, channelId);

        if (!fetchedTUs || fetchedTUs.length === 0) {
            throw new Error(`No TUs found for the provided GUIDs in channel "${channelId}"`);
        }

        // Convert fetched TUs to proper source TU objects
        const sourceTUs = fetchedTUs.map(tu => {
            try {
                return TU.asSource(tu);
            } catch (error) {
                throw new Error(`Failed to create source TU for guid ${tu.guid}: ${error.message}`);
            }
        });

        // Create job with the source TUs
        const jobRequest = {
            sourceLang,
            targetLang,
            tus: sourceTUs
        };

        // Create jobs and assign to provider
        const assignedJobs = await mm.dispatcher.createJobs(
            jobRequest,
            { providerList: [provider], skipGroupCheck: true, skipQualityCheck: true }
        );

        // Find the job assigned to the requested provider
        const job = assignedJobs.find(j => j.translationProvider === provider);
        
        if (!job) {
            // Check if any TUs were rejected
            const rejectedJob = assignedJobs.find(j => !j.translationProvider);
            if (rejectedJob && rejectedJob.tus.length > 0) {
                throw new Error(`Provider "${provider}" did not accept any of the ${guids.length} translation units. ` +
                    `The provider may not support the requested language pair or content type.`);
            }
            throw new Error(`Failed to create job with provider "${provider}"`);
        }

        // Start the job
        const jobStatuses = await mm.dispatcher.startJobs(
            [job],
            { instructions }
        );

        const jobStatus = jobStatuses.find(s => s.jobGuid === job.jobGuid);
        if (!jobStatus) {
            throw new Error(`Failed to start job ${job.jobGuid}`);
        }

        // Retrieve the job to get translated TUs
        const completedJob = await mm.tmm.getJob(job.jobGuid);
        
        if (!completedJob) {
            throw new Error(`Job ${job.jobGuid} not found after completion`);
        }

        // Extract translated TUs (those with ntgt, excluding inflight ones)
        // Use the inflight array from the job response to filter
        const inflightGuidsSet = new Set(completedJob.inflight || []);
        const translatedTUs = completedJob.tus
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

