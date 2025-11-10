import { z } from 'zod';
import { McpTool, McpInputError, McpNotFoundError, McpToolError } from './mcpTool.js';

/**
 * MCP tool for querying source content and translation memory.
 * 
 * This tool calls the underlying MonsterManager methods directly,
 * avoiding CLI-specific concerns like console logging and file I/O.
 */
export class SourceQueryTool extends McpTool {
    static metadata = {
        name: 'source_query',
        description: `Query sources in the source snapshot.
You can write your own where conditions using SQL syntaxt against the following columns:
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
- chars: Character count`,
        inputSchema: z.object({
            lang: z.string()
                .regex(/^[^,\s]+,[^,\s]+$/, 'Format must be "srcLang,tgtLang"')
                .describe('Source and target language pair in format "srcLang,tgtLang" (e.g., "en,es")'),
            channel: z.string()
                .describe('Channel ID to query sources from'),
            whereCondition: z.string()
                .optional()
                .describe('SQL WHERE condition against sources (default: "true" to match all)'),
        })
    };

    static async execute(mm, args) {
        const [sourceLang, targetLang] = args.lang.split(',').map(part => part.trim());
        const channelId = args.channel.trim();
        const whereCondition = args.whereCondition ?? 'true';

        const availableChannels = mm.rm.channelIds ?? [];
        if (availableChannels.length > 0 && !availableChannels.includes(channelId)) {
            throw new McpNotFoundError(`Channel "${channelId}" not found`, {
                hints: [`Available channels: ${availableChannels.join(', ')}`]
            });
        }

        // Get translation memory and query sources
        let tm;
        try {
            tm = mm.tmm.getTM(sourceLang, targetLang);
        } catch (error) {
            throw new McpInputError(`Language pair ${sourceLang}→${targetLang} is not available`, {
                hints: ['Call translation_status with include=["coverage"] to inspect available language pairs.'],
                cause: error
            });
        }

        let tus;
        try {
            tus = await tm.querySource(channelId, whereCondition);
        } catch (error) {
            throw new McpToolError('Failed to execute query against source snapshot', {
                code: 'QUERY_FAILED',
                hints: [
                    'Verify that your SQL WHERE clause only references supported columns.',
                    'Escaping: wrap string literals in single quotes.'
                ],
                details: { channelId, whereCondition },
                cause: error
            });
        }

        return {
            message: tus.length === 0 ? 'No content returned for the specified query' : `Found ${tus.length} translation units`,
            sourceLang,
            targetLang,
            translationUnits: tus,
        };

    }
}

