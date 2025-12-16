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
            sourceLang: z.string()
                .describe('Source language code (e.g., "en-US")'),
            targetLang: z.string()
                .describe('Target language code (e.g., "es-419")'),
            channel: z.string()
                .optional()
                .describe('Channel ID to query sources from. If omitted, queries all channels.'),
            whereCondition: z.string()
                .optional()
                .describe('SQL WHERE condition against sources (default: "true" to match all)'),
        })
    };

    static async execute(mm, args) {
        const { sourceLang, targetLang, channel } = args;
        const whereCondition = args.whereCondition ?? 'true';

        const availableChannels = mm.rm.channelIds ?? [];
        const channels = channel ? [channel] : availableChannels;

        if (channel && availableChannels.length > 0 && !availableChannels.includes(channel)) {
            throw new McpNotFoundError(`Channel "${channel}" not found`, {
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

        const tus = [];
        for (const channelId of channels) {
            try {
                const channelTus = await tm.querySource(channelId, whereCondition);
                tus.push(...channelTus);
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
        }

        return {
            message: tus.length === 0 ? 'No content returned for the specified query' : `Found ${tus.length} translation units`,
            sourceLang,
            targetLang,
            translationUnits: tus,
        };

    }
}

