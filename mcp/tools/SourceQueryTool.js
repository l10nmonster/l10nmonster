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
        description: `Query sources  and optionally create translation jobs.

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
- chars: Character count`,
        inputSchema: z.object({
            lang: z.string()
                .describe('Source and target language pair in format "srcLang,tgtLang" (e.g., "en,es")'),
            channel: z.string()
                .describe('Channel ID to query sources from'),
            whereCondition: z.string()
                .optional()
                .describe('SQL WHERE condition against sources (default: "true" to match all)'),
        })
    };

    static async execute(mm, args) {
        const [sourceLang, targetLang] = args.lang.split(',');
        
        if (!targetLang) {
            throw new Error('Missing target language. Format: "srcLang,tgtLang"');
        }

        if (!args.channel) {
            throw new Error('Missing channel ID');
        }

        // Get translation memory and query sources
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        const tus = await tm.querySource(args.channel, args.whereCondition ?? 'true');

        return {
            message: tus.length === 0 ? 'No content returned for the specified query' : `Found ${tus.length} translation units`,
            sourceLang,
            targetLang,
            translationUnits: tus,
        };

    }
}

