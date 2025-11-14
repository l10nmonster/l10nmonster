import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import * as mcpTools from './tools/index.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Session management for HTTP transport
const sessions = new Map(); // sessionId -> { transport, lastActivity }
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Shared MCP server instance per MonsterManager
// Use a WeakMap to avoid memory leaks. Once all sessions to a server are closed the server will be garbage collected.
const serverInstances = new WeakMap(); // monsterManager -> McpServer


async function getMcpPackageVersion() {
    try {
        const packageJsonContent = await readFile(path.join(import.meta.dirname, 'package.json'), 'utf-8');
        const packageJson = JSON.parse(packageJsonContent.toString());
        return packageJson.version;
    } catch (error) {
        console.error('Error parsing MCP package version:', error);
        return '0.0.1-unknown';
    }
}

// Set server version to be the package version
const serverVersion = await getMcpPackageVersion();

/**
 * Setup tools on an MCP server instance
 * 
 * Registers all MCP tools exported from ./tools/index.js
 */
async function setupToolsOnServer(server, monsterManager) {
    // Get all tool classes exported from tools/index.js
    // Filter for classes that have the handler static method and metadata
    const toolClasses = Object.values(mcpTools).filter(ToolClass => (
        ToolClass && 
        typeof ToolClass === 'function' && 
        typeof ToolClass.handler === 'function' && 
        ToolClass.metadata));

    for (const ToolClass of toolClasses) {
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
    }
}

/**
 * Get or create a shared MCP server instance for a MonsterManager
 */
async function getOrCreateSharedServer(monsterManager) {
    let server = serverInstances.get(monsterManager);
    
    if (!server) {
        server = new McpServer({
            name: 'l10nmonster-mcp',
            version: serverVersion,
        });
        
        await setupToolsOnServer(server, monsterManager);
        serverInstances.set(monsterManager, server);
        console.info('Created shared MCP server instance');
    }
    
    return server;
}

/**
 * Clean up expired sessions on-demand
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
            console.info(`Cleaning up expired session: ${sessionId}`);
            sessions.delete(sessionId);
            cleaned++;
        }
    }
    return cleaned;
}

/**
 * Creates MCP route handlers for use with the serve action extension mechanism.
 * Returns route definitions that can be registered via ServeAction.registerExtension.
 * 
 * @param {import('@l10nmonster/core').MonsterManager} mm - MonsterManager instance
 * @returns {Array<[string, string, Function]>} Array of [method, path, handler] route definitions
 */
export function createMcpRoutes(mm) {
    // Handle POST requests for client-to-server communication
    const handlePost = async (req, res) => {
        // Clean up expired sessions on each request
        cleanupExpiredSessions();
        
        try {
            const sessionId = req.headers['mcp-session-id'];
            let session;

            if (sessionId && sessions.has(sessionId)) {
                // Existing session - update activity timestamp
                session = sessions.get(sessionId);
                session.lastActivity = Date.now();
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request - create transport and connect shared server
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (newSessionId) => {
                        sessions.set(newSessionId, {
                            transport,
                            lastActivity: Date.now(),
                        });
                    },
                    // DNS rebinding protection is disabled by default for backwards compatibility.
                    // For production use, consider enabling:
                    // enableDnsRebindingProtection: true,
                    // allowedHosts: ['127.0.0.1'],
                });

                transport.onclose = () => {
                    if (transport.sessionId) {
                        console.info(`Session closed: ${transport.sessionId}`);
                        sessions.delete(transport.sessionId);
                    }
                };
                
                // Get or create shared MCP server and connect to new transport
                const server = await getOrCreateSharedServer(mm);
                await server.connect(transport);
                console.info(`New MCP session initialized: ${transport.sessionId}`);
                
                session = { transport, lastActivity: Date.now() };
            } else {
                // Invalid request - no session ID and not an initialize request
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided and not an initialize request',
                    },
                    id: null,
                });
            }

            // Handle the request through the transport
            await session.transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error('Error handling MCP POST request:', error);
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                    data: { detail: error.message },
                },
                id: null,
            });
        }
    };

    // Handle GET and DELETE requests for existing sessions
    const handleSessionRequest = async (req, res) => {
        // Clean up expired sessions on each request
        cleanupExpiredSessions();
        
        try {
            const sessionId = req.headers['mcp-session-id'];
            
            if (!sessionId || !sessions.has(sessionId)) {
                return res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Invalid or missing session ID',
                    },
                    id: null,
                });
            }

            const session = sessions.get(sessionId);
            session.lastActivity = Date.now();
            await session.transport.handleRequest(req, res);
        } catch (error) {
            console.error('Error handling MCP session request:', error);
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                    data: { detail: error.message },
                },
                id: null,
            });
        }
    };

    return [
        ['post', '/', handlePost],
        ['get', '/', handleSessionRequest],
        ['delete', '/', handleSessionRequest],
    ];
}
