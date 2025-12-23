import { z } from 'zod';

/**
 * Base error type for MCP tools with structured metadata.
 */
export class McpToolError extends Error {

    /**
     * @param {string} message Error message
     * @param {Object} [options]
     * @param {string} [options.code] Stable machine readable error code
     * @param {boolean} [options.retryable=false] Whether the caller can retry safely
     * @param {string[]} [options.hints] Recovery hints for the caller
     * @param {unknown} [options.details] Arbitrary structured payload with extra context
     * @param {Error} [options.cause] Underlying error
     */
    constructor(message, { code, retryable = false, hints, details, cause } = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.retryable = retryable;
        this.hints = hints;
        this.details = details;
        if (cause) {
            this.cause = cause;
        }
    }

    static wrap(error, defaults = {}) {
        if (error instanceof McpToolError) {
            return error;
        }
        return new McpToolError(error?.message ?? 'Unexpected error', {
            cause: error,
            ...defaults
        });
    }
}

export class McpInputError extends McpToolError {
    constructor(message, options = {}) {
        super(message, { code: 'INVALID_INPUT', ...options });
    }
}

export class McpNotFoundError extends McpToolError {
    constructor(message, options = {}) {
        super(message, { code: 'NOT_FOUND', ...options });
    }
}

export class McpProviderError extends McpToolError {
    constructor(message, options = {}) {
        super(message, { code: 'PROVIDER_ERROR', ...options });
    }
}

/**
 * Base class for MCP tools that call underlying MonsterManager functions directly.
 *
 * MCP tools are separate from CLI actions and:
 * - Return structured data (not console output)
 * - Have MCP-optimized schemas (not CLI-optimized)
 * - Call underlying MonsterManager methods directly
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
        if (result && typeof result === 'object') {
            // Pass through responses that already conform to MCP response shape
            if (Array.isArray(result.content)) {
                return result;
            }
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }]
            };
        }
        
        const text = typeof result === 'string' ? result : String(result);
        
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
        const normalized = McpToolError.wrap(error, { code: 'UNKNOWN_ERROR' });
        const summary = `Error executing ${this.metadata.name}: ${normalized.message}`;

        const payload = {
            name: normalized.name,
            message: normalized.message,
            code: normalized.code ?? 'UNKNOWN_ERROR',
            retryable: Boolean(normalized.retryable),
            hints: normalized.hints ?? [],
            details: normalized.details
        };

        const cause = normalized.cause;
        if (cause && typeof cause === 'object') {
            let causeName;
            if ('name' in cause && typeof cause.name === 'string') {
                causeName = cause.name;
            } else if (cause.constructor && typeof cause.constructor.name === 'string') {
                causeName = cause.constructor.name;
            }

            let causeMessage;
            if ('message' in cause && typeof cause.message === 'string') {
                causeMessage = cause.message;
            }

            payload.cause = {
                name: causeName,
                message: causeMessage
            };
        }
        
        if (error instanceof z.ZodError) {
            payload.code = 'INVALID_INPUT';
            payload.details = {
                issues: error.issues.map(issue => ({
                    path: issue.path.join('.') || '(root)',
                    message: issue.message,
                    code: issue.code
                }))
            };
            if (!payload.hints || payload.hints.length === 0) {
                payload.hints = [
                    'Inspect the schema and ensure all required fields are provided.',
                    'Check enum values and optional defaults.'
                ];
            }
        }
        
        if (typeof normalized.stack === 'string') {
            payload.stack = normalized.stack;
        }
        
        return {
            content: [{
                type: 'text',
                text: summary
            }, {
                type: 'text',
                text: JSON.stringify(payload, null, 2)
            }],
            isError: true
        };
    }
}

