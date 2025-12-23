/**
 * Central type definitions for @l10nmonster/mcp
 * This is the single source of truth for MCP tool interfaces.
 */

/**
 * MCP tool metadata definition.
 */
export interface McpToolMetadata {
    /** Tool name identifier. */
    name: string;
    /** Tool description for discovery. */
    description: string;
    /** Zod input schema for validation. */
    inputSchema: unknown;
}

/**
 * MCP content item in a response.
 */
export interface McpContentItem {
    /** Content type (text, image, resource). */
    type: 'text' | 'image' | 'resource';
    /** Text content (for type='text'). */
    text?: string;
    /** Base64 data (for type='image'). */
    data?: string;
    /** MIME type (for type='image' or 'resource'). */
    mimeType?: string;
}

/**
 * MCP tool response format.
 */
export interface McpToolResponse {
    /** Array of content items. */
    content: McpContentItem[];
    /** True if this response represents an error. */
    isError?: boolean;
}

/**
 * MCP tool interface - defines contract for MCP tools.
 */
export interface McpToolInterface {
    /** Static metadata for the tool. */
    metadata: McpToolMetadata;

    /**
     * Execute the tool with given arguments.
     * @param mm - MonsterManager instance.
     * @param args - Tool arguments.
     * @returns Tool result.
     */
    execute(mm: unknown, args: Record<string, unknown>): Promise<unknown>;

    /**
     * Get handler function for MCP registration.
     * @param mm - MonsterManager instance.
     * @returns Handler function.
     */
    handler(mm: unknown): (args: Record<string, unknown>) => Promise<McpToolResponse>;

    /**
     * Format a result for MCP response.
     * @param result - Tool execution result.
     * @returns Formatted MCP response.
     */
    formatResult(result: unknown): McpToolResponse;

    /**
     * Format an error for MCP response.
     * @param error - Error to format.
     * @returns Formatted error response.
     */
    formatError(error: Error): McpToolResponse;
}
