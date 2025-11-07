import { randomUUID } from 'node:crypto';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as mcpTools from './tools/index.js';

/**
 * Setup tools on an MCP server instance
 * 
 * Registers all MCP tools exported from ./tools/index.js
 */
async function setupToolsOnServer(server, monsterManager) {
    try {
        // Get all tool classes exported from tools/index.js
        // Filter for classes that have the handler static method and metadata
        const toolClasses = Object.values(mcpTools).filter(ToolClass => ToolClass && typeof ToolClass === 'function' && typeof ToolClass.handler === 'function' && ToolClass.metadata);

        for (const ToolClass of toolClasses) {
            try {
                const { name, description, inputSchema } = ToolClass.metadata;
                const handler = ToolClass.handler(monsterManager);
                
                console.info(`Registering MCP tool: ${name}`);
                await server.registerTool(
                    name,
                    {
                        title: name,
                        description,
                        inputSchema: inputSchema.shape,
                    },
                    handler,
                );
            } catch (error) {
                console.error(`Error registering tool ${ToolClass.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Error setting up MCP tools:', error);
    }
}

/**
 * L10n Monster MCP Server - provides translation management functionality through MCP tools
 */
export class MCPServer {
    constructor(monsterManager, options = {}) {
        this.mm = monsterManager;
        this.useStdio = options.stdio || false;
        this.port = options.port || 3000;

        // Session management for HTTP transport
        this.sessions = new Map(); // sessionId -> { transport, server }

        // Persistent MCP server instance (used in stdio mode and for tests)
        this.server = new McpServer({
            name: 'l10nmonster-mcp',
            version: '1.0.0',
        });
    }

    /**
     * Set up tools on the persistent server instance.
     * Kept separate to match test expectations and allow reuse.
     */
    async setupTools() {
        try {
            await setupToolsOnServer(this.server, this.mm);
        } catch (err) {
            console.error('Error setting up mcp tools:', err);
        }
    }

    async createHTTPServer() {
        const app = express();
        app.use(express.json());

        // Use instance sessions map to store transports by session ID
        const transports = this.sessions;

        // Handle POST requests for client-to-server communication
        app.post('/mcp', async (req, res) => {
            // Check for existing session ID
            const sessionId = req.headers['mcp-session-id'];
            let transport;

            if (sessionId && transports.get(sessionId)) {
                transport = transports.get(sessionId);
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId) => {
                        transports.set(sessionId, transport);
                    },
                    // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
                    // locally, make sure to set:
                    // enableDnsRebindingProtection: true,
                    // allowedHosts: ['127.0.0.1'],
                });

                transport.onclose = () => {
                    if (transport.sessionId) {
                        transports.delete(transport.sessionId);
                    }
                };

                // Set up server resources, tools, and prompts.
                const server = new McpServer({
                    name: 'l10nmonster-mcp',
                    version: '1.0.0',
                });

                await setupToolsOnServer(server, this.mm);

                // Connect to the MCP server
                await server.connect(transport);
                console.error(`Connected to new transport`);
            } else {
                // Invalid request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message:
                            'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return;
            }
            // Handle the request
            await transport.handleRequest(req, res, req.body);
        });

        // Reusable handler for GET and DELETE requests
        const handleSessionRequest = async (req, res) => {
            const sessionId = req.headers['mcp-session-id'];
            if (!sessionId || !transports.has(sessionId)) {
                res.status(400).send('Invalid or missing session ID');
                return;
            }

            const transport = transports.get(sessionId);
            await transport.handleRequest(req, res);
        };

        // Handle GET requests for server-to-client notifications via SSE
        app.get('/mcp', handleSessionRequest);

        // Handle DELETE requests for session termination
        app.delete('/mcp', handleSessionRequest);

        this.httpServer = app.listen(this.port);

        // Return app to the caller for testing/lifecycle hooks
        return app;
    }
    
    /**
     * Start the MCP server with configured transport.
     */
    async start() {
        if (this.useStdio) {
            const transport = new StdioServerTransport();
            await this.setupTools();
            await this.server.connect(transport);
            console.error('L10n Monster MCP server started (stdio transport)');
        } else {
            this.app = await this.createHTTPServer();
            console.error(`L10n Monster MCP server started (http transport); port ${this.port})`);
        }

        // Keep the process running
        process.on('SIGINT', () => {
            console.error('Shutting down L10n Monster MCP server...');
            process.exit(0);
        });
    }
}
