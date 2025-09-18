import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { configureMcpTools } from './utils/mcpTools.js';

/**
 * L10n Monster MCP Server - provides translation management functionality through MCP tools
 */
export class L10nMonsterMCPServer {
    constructor(monsterManager) {
        this.mm = monsterManager;
        this.server = new Server({
            name: 'l10nmonster-mcp',
            version: '1.0.0'
        }, {
            capabilities: {
                tools: {}
            }
        });
        
        this.toolHandlers = new Map();
        this.setupRequestHandlers();
    }

    async setupTools() {
        try {
            // For Phase 1, we'll focus on just source_query action
            // Later phases will auto-discover all actions from monster config
            
            // Import source_query action
            const { source_query } = await import('../core/src/actions/sourceQuery.js');
            configureMcpTools(this.server, source_query, this.mm, this.toolHandlers);
        } catch (error) {
            console.error('Error loading source_query action:', error);
        }
    }

    setupRequestHandlers() {
        // Handle list tools request
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = [];
            
            // Get registered tools from the server
            if (this.server._tools) {
                for (const [name, tool] of this.server._tools) {
                    tools.push({
                        name,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            }
            
            return { tools };
        });

        // Handle call tool request
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            const handler = this.toolHandlers.get(name);
            if (!handler) {
                throw new Error(`Unknown tool: ${name}`);
            }
            
            return await handler(args || {});
        });
    }

    /**
     * Start the MCP server with stdio transport
     */
    async start() {
        // Setup tools before starting the server
        await this.setupTools();
        
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        
        console.error('L10n Monster MCP server started (stdio transport)');
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.error('Shutting down L10n Monster MCP server...');
            process.exit(0);
        });
    }
}

export default L10nMonsterMCPServer;

// Export the MCP serve action for CLI integration
export { default as mcpServe } from './mcp_serve.js';