export class mcp {
    static help = {
        description: 'starts the L10n Monster MCP server.',
        options: [
            ['--stdio', 'use stdio transport (default)']
        ]
    };

    static async action(mm) {
        try {
            // Dynamic import of the MCP server
            const { L10nMonsterMCPServer } = await import('./server.js');
            const mcpServer = new L10nMonsterMCPServer(mm);
            
            // Start the MCP server with stdio transport
            await mcpServer.start();
            
            console.error('L10n Monster MCP server started successfully');
            
        } catch (error) {
            console.error(`Error starting MCP server: ${error.message}`);
            throw error;
        }
    }
}