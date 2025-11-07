import { z } from 'zod';
import { McpTool } from './BaseMcpTool.js';

/**
 * MCP tool for querying source content and translation memory.
 * 
 * This tool calls the underlying MonsterManager methods directly,
 * avoiding CLI-specific concerns like console logging and file I/O.
 */
export class SourceQueryTool extends McpTool {
    static metadata = {
        name: 'source_query',
        description: `Query sources in the local cache and optionally create translation jobs.

You can write your own where conditions against the following columns:
- channel: Channel id
- prj: Project id
- rid: Resource id
- sid: Segment id
- guid: Segment guid
- nsrc: Normalized source
- minQ: Desired minimum quality
- ntgt: Normalized translation (if available)
- q: Quality score (if translation is available)
- notes: Notes object (if any)
- mf: Message format id
- segProps: Non-standard segment properties object (if any)
- words: Word count
- chars: Character count

WARNING: Because of potential SQL injection attacks, don't use this unless you know what you're doing!`,
        inputSchema: z.object({
            lang: z.string()
                .describe('Source and target language pair in format "srcLang,tgtLang" (e.g., "en,es")'),
            whereCondition: z.string()
                .optional()
                .describe('SQL WHERE condition against sources (default: "true" to match all)'),
            provider: z.array(z.string())
                .optional()
                .describe('Translation providers to use for job creation'),
            push: z.boolean()
                .optional()
                .default(false)
                .describe('Whether to push content to providers immediately'),
            instructions: z.string()
                .optional()
                .describe('Job-specific instructions for translation providers')
        })
    };

    static async execute(mm, args) {
        const [sourceLang, targetLang] = args.lang.split(',');
        
        if (!targetLang) {
            throw new Error('Missing target language. Format: "srcLang,tgtLang"');
        }

        // Get translation memory and query sources
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const tus = tm.querySource(args.whereCondition ?? 'true');

        if (tus.length === 0) {
            return {
                sourceLang,
                targetLang,
                translationUnits: [],
                jobs: [],
                message: 'No content returned for the specified query'
            };
        }

        const result = {
            sourceLang,
            targetLang,
            translationUnits: tus.length,
            jobs: []
        };

        // Create jobs if providers are specified
        if (args.provider && args.provider.length > 0) {
            const assignedJobs = await mm.dispatcher.createJobs(
                { sourceLang, targetLang, tus },
                { providerList: args.provider }
            );

            // Format jobs for response
            result.jobs = assignedJobs.map(job => ({
                translationProvider: job.translationProvider || null,
                segmentCount: job.tus.length,
                estimatedCost: job.estimatedCost,
                jobGuid: job.jobGuid || null,
                formattedCost: job.estimatedCost === undefined ? 'unknown' : mm.currencyFormatter.format(job.estimatedCost)
            }));

            // Push jobs if requested
            if (args.push) {
                const jobsToPush = assignedJobs.filter(job => job.translationProvider);
                if (jobsToPush.length > 0) {
                    const jobStatus = await mm.dispatcher.startJobs(
                        jobsToPush,
                        { instructions: args.instructions }
                    );
                    
                    result.pushedJobs = jobStatus.map(status => ({
                        sourceLang: status.sourceLang,
                        targetLang: status.targetLang,
                        jobGuid: status.jobGuid,
                        translationProvider: status.translationProvider,
                        status: status.status
                    }));
                }
            }
        }

        return result;
    }
}

