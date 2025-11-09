import { z } from 'zod';

/**
 * Base class for MCP tools that call underlying MonsterManager functions directly.
 * 
 * MCP tools are separate from CLI actions and:
 * - Return structured data (not console output)
 * - Have MCP-optimized schemas (not CLI-optimized)
 * - Call underlying MonsterManager methods directly
 * - Don't perform  console logging
 */

export class McpTool {

    /**
     * Static metadata object containing:
     * - name: Tool identifier
     * - description: Tool description for MCP
     * - inputSchema: Zod schema for input validation
     * 
     * Subclasses must define this static property.
     */
    static metadata = {
        name: '',
        description: '',
        inputSchema: z.object({})
    };

    /**
     * Execute the tool with validated arguments
     * @param {Object} mm - MonsterManager instance
     * @param {Object} args - Validated arguments from Zod schema
     * @returns {Promise<*>} Result from tool execution (will be formatted by handler)
     */
    // eslint-disable-next-line no-unused-vars
    static async execute(mm, args) {
        throw new Error('Subclasses must implement execute()');
    }

    /**
     * Returns an async handler function for MCP tool registration
     * @param {Object} mm - MonsterManager instance
     * @returns {Function} Async handler function
     */
    static handler(mm) {
        const schema = this.metadata.inputSchema;
        
        return async (args) => {
            try {
                const validatedArgs = schema.parse(args);
                const result = await this.execute(mm, validatedArgs);
                return this.formatResult(result);
            } catch (error) {
                return this.formatError(error);
            }
        };
    }

    /**
     * Format a result for MCP response
     * @param {*} result - Result from execute()
     * @returns {Object} MCP-formatted response
     */
    static formatResult(result) {
        let text;
        
        if (typeof result === 'string') {
            text = result;
        } else if (result && typeof result === 'object') {
            text = JSON.stringify(result, null, 2);
        } else {
            text = String(result);
        }
        
        return {
            content: [{
                type: 'text',
                text
            }]
        };
    }

    /**
     * Format an error for MCP response
     * @param {Error} error - Error that occurred
     * @returns {Object} MCP-formatted error response
     */
    static formatError(error) {
        let text = `Error executing ${this.metadata.name}: ${error.message}`;
        
        if (error instanceof z.ZodError) {
            const details = error.issues?.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            if (details) text += ` | ${details}`;
        }
        
        return {
            content: [{
                type: 'text',
                text
            }],
            isError: true
        };
    }
}

