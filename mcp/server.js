import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { convertToMcpTool } from './utils/mcpTools.js';

/**
 * L10n Monster MCP Server - provides translation management functionality through MCP tools
 */
export class MCPServer {
    constructor(monsterManager) {
        this.mm = monsterManager;
        this.server = new McpServer({
            name: 'l10nmonster-mcp',
            version: '1.0.0'
        });
    }

    async setupTools() {
        try {
            // TODO: auto-discover all actions from monster config
            // Import source_query action
            const { source_query } = await import('../core/src/actions/sourceQuery.js');
            const tool = convertToMcpTool(source_query, this.mm);
            
            if (tool) {
                this.server.registerTool(
                    tool.name,
                    {
                        title: tool.name,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    },
                    tool.handler
                );
            }
        } catch (error) {
            console.error('Error loading source_query action:', error);
        }
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

export default MCPServer;