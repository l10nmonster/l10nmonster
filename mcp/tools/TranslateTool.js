import { z } from 'zod';
import { McpTool } from './BaseMcpTool.js';
import { TU } from '@l10nmonster/core';

/**
 * MCP tool for translating a list of source translation units.
 * 
 * This tool creates a translation job, assigns it to a provider,
 * starts the job, and returns the translated TUs.
 */
export class TranslateTool extends McpTool {
    static metadata = {
        name: 'translate',
        description: `Translate a list of source translation units (TUs) using a specified provider.

This tool:
1. Creates a translation job with the provided source TUs
2. Assigns the job to the specified translation provider
3. Starts the job (executes the translation)
4. Returns the translated TUs with their target text

Each source TU must have:
- guid: Unique identifier for the TU
- rid: Resource ID the TU belongs to
- sid: Segment ID the TU belongs to
- nsrc: Normalized source strings (array of strings)

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
            provider: z.string()
                .describe('Translation provider ID to use for translation'),
            tus: z.array(z.object({
                guid: z.string().describe('Unique identifier for the translation unit'),
                rid: z.string().describe('Resource ID the TU belongs to'),
                sid: z.string().describe('Segment ID the TU belongs to'),
                nsrc: z.array(z.string()).describe('Normalized source strings'),
                prj: z.string().optional().describe('Project ID (optional)'),
                notes: z.any().optional().describe('Notes object (optional)'),
                seq: z.number().optional().describe('Sequence number (optional)'),
                nid: z.string().optional().describe('Native ID (optional)'),
                isSuffixPluralized: z.boolean().optional().describe('Whether suffix is pluralized (optional)'),
                jobProps: z.any().optional().describe('Job-specific properties (optional)'),
            }))
                .min(1)
                .describe('Array of source translation units to translate'),
            instructions: z.string()
                .optional()
                .describe('Optional instructions for the translation provider')
        })
    };

    static async execute(mm, args) {
        const { sourceLang, targetLang, provider, tus, instructions } = args;

        // Validate that TUs have required fields
        for (const tu of tus) {
            if (!tu.guid || !tu.rid || !tu.sid || !Array.isArray(tu.nsrc)) {
                throw new Error(`Invalid TU: must have guid, rid, sid, and nsrc array. Got: ${JSON.stringify(tu)}`);
            }
        }

        // Convert input TUs to proper TU objects
        const sourceTUs = tus.map(tu => {
            try {
                return TU.asSource(tu);
            } catch (error) {
                throw new Error(`Failed to create source TU: ${error.message}`);
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
            { providerList: [provider] }
        );

        // Find the job assigned to the requested provider
        const job = assignedJobs.find(j => j.translationProvider === provider);
        
        if (!job) {
            // Check if any TUs were rejected
            const rejectedJob = assignedJobs.find(j => !j.translationProvider);
            if (rejectedJob && rejectedJob.tus.length > 0) {
                throw new Error(
                    `Provider "${provider}" did not accept any of the ${tus.length} translation units. ` +
                    `The provider may not support the requested language pair or content type.`
                );
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

