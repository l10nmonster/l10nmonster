// Main MCP server integration
export { createMcpRoutes } from './server.js';

// Tool registration for extensibility
import { registry } from './tools/registry.js';
export const registerTool = registry.registerTool.bind(registry);

// Base classes and utilities for creating custom tools
export { 
    McpTool,
    McpToolError,
    McpInputError,
    McpNotFoundError,
    McpProviderError
} from './tools/mcpTool.js';