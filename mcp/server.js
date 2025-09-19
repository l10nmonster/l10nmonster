import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { convertToMcpTool } from './utils/mcpTools.js';
import { z } from 'zod';

/**
 * Setup tools on an MCP server instance
 */
async function setupToolsOnServer(server, monsterManager) {
    try {
        // TODO: auto-discover all actions from monster config
        // Import source_query action
        const { source_query } = await import(
            '../core/src/actions/sourceQuery.js'
        );
        const tool = convertToMcpTool(source_query, monsterManager);

        if (tool) {
            console.info(`Registering MCP tool: ${tool.name}`);
            await server.registerTool(
                tool.name,
                {
                    title: tool.name,
                    description: tool.description,
                    inputSchema: {city: z.string()},
                },
                tool.handler,
            );
        }
    } catch (error) {
        console.error('Error loading source_query action:', error);
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
    }

    async createHTTPServer() {
        // Create Express app with session support

        const app = express();
        app.use(express.json());

        // Map to store transports by session ID
        const transports = new Map();

        // Handle POST requests for client-to-server communication
        app.post('/mcp', async (req, res) => {
            // Check for existing session ID
            const sessionId = req.headers['mcp-session-id'];
            let transport;

            if (sessionId && transports.get(sessionId)) {
                // Reuse existing transport
                transport = transports.get(sessionId);
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId) => {
                        // Store the transport by session ID
                        transports.set(sessionId, transport);
                    },
                    // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
                    // locally, make sure to set:
                    // enableDnsRebindingProtection: true,
                    // allowedHosts: ['127.0.0.1'],
                });

                // Clean up transport when closed
                transport.onclose = () => {
                    if (transport.sessionId) {
                        delete transports[transport.sessionId];
                    }
                };

                // ... set up server resources, tools, and prompts ...
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
            if (!sessionId || !transports[sessionId]) {
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

        app.listen(this.port);
        console.error(`L10n Monster MCP server started (port ${this.port})`);

    }
    
    /**
     * Start the MCP server with configured transport
     */
    async start() {
        if (this.useStdio) {
            const transport = new StdioServerTransport();
            const server = new McpServer({
                name: 'l10nmonster-mcp',
                version: '1.0.0',
            });
            await setupToolsOnServer(server, this.mm);
            await server.connect(transport);
            console.error('L10n Monster MCP server started (stdio transport)');
        } else {
            this.app = await this.createHTTPServer();
        }

        // Keep the process running
        process.on('SIGINT', () => {
            console.error('Shutting down L10n Monster MCP server...');
            process.exit(0);
        });
    }
}
