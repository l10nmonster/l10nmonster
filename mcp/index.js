import { MCPServer } from './server.js';
export class mcp {
    static help = {
        description: 'starts the L10n Monster MCP server.',
        options: [
            ['--stdio', 'use stdio transport instead of HTTP/SSE'],
            ['--port <port>', 'port for HTTP/SSE transport (default: 3000)']
        ]
    };

    static async action(mm, args = {}) {
        try {
            const options = {
                stdio: args.stdio || false,
                port: args.port ? parseInt(args.port, 10) : 3000
            };
            
            const mcpServer = new MCPServer(mm, options);
            await mcpServer.start();
            
            console.info('L10n Monster MCP server started successfully');
            return mcpServer;

        } catch (error) {
            console.error(`Error starting MCP server: ${error.message}`);
            throw error;
        }
    }
}