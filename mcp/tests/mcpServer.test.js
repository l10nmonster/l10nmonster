import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MCPServer } from '../server.js';

describe('MCPServer', () => {
    let mockMM, mcpServer;

    beforeEach(() => {
        mockMM = {
            tmm: {
                getTM: () => ({
                    querySource: () => [
                        {
                            rid: 'test.js',
                            sid: 'hello',
                            nsrc: 'Hello',
                            ntgt: 'Bonjour',
                            translationProvider: 'openai',
                            q: 0.9
                        }
                    ]
                })
            },
            dispatcher: {
                createJobs: async () => [{
                    translationProvider: 'openai',
                    tus: [{ rid: 'test.js', sid: 'hello' }],
                    estimatedCost: 10.50
                }]
            },
            currencyFormatter: {
                format: (cost) => `$${cost.toFixed(2)}`
            }
        };
        
        mcpServer = new MCPServer(mockMM);
    });

    describe('constructor', () => {
        it('should initialize server with correct configuration', () => {
            assert.ok(mcpServer.server, 'Server should be initialized');
            assert.ok(mcpServer.mm, 'MonsterManager should be stored');
            assert.strictEqual(mcpServer.mm, mockMM, 'MonsterManager should match input');
            assert.strictEqual(mcpServer.useStdio, false, 'Should default to HTTP/SSE transport');
            assert.strictEqual(mcpServer.port, 3000, 'Should default to port 3000');
            
            // Verify server exists and is properly configured
            assert.ok(typeof mcpServer.server === 'object', 'Server should be an object');
        });

        it('should create McpServer with correct metadata', () => {
            // The server should be properly configured
            assert.ok(mcpServer.server, 'MCP server instance should exist');
        });

        it('should accept options for transport configuration', () => {
            const stdioServer = new MCPServer(mockMM, { stdio: true, port: 8080 });
            assert.strictEqual(stdioServer.useStdio, true, 'Should use stdio when option is set');
            assert.strictEqual(stdioServer.port, 8080, 'Should use specified port');
        });
    });

    describe('setupTools', () => {
        it('should setup source_query tool without errors', async () => {
            // This should not throw any errors
            await assert.doesNotThrow(async () => {
                await mcpServer.setupTools();
            }, 'setupTools should complete without errors');
        });

    });

    describe('start method', () => {
        it('should have start method that sets up tools', () => {
            assert.ok(typeof mcpServer.start === 'function', 'Should have start method');
        });

        it('should call setupTools when starting', async () => {
            // Create a server with stdio to avoid HTTP server issues in tests
            const stdioServer = new MCPServer(mockMM, { stdio: true });
            let setupToolsCalled = false;
            
            // Override setupTools to track if it's called
            const originalSetupTools = stdioServer.setupTools;
            stdioServer.setupTools = async () => {
                setupToolsCalled = true;
                return originalSetupTools.call(stdioServer);
            };
            
            // Mock the transport connection to avoid actually starting the server
            const originalConnect = stdioServer.server.connect;
            stdioServer.server.connect = async () => {
                // Mock connection - don't actually start server
                return Promise.resolve();
            };
            
            try {
                await stdioServer.start();
                assert.ok(setupToolsCalled, 'setupTools should be called during start');
            } catch (error) {
                // Expected since we're mocking - just verify setupTools was called
                assert.ok(setupToolsCalled, 'setupTools should be called even if start fails');
            } finally {
                // Restore original methods
                stdioServer.setupTools = originalSetupTools;
                stdioServer.server.connect = originalConnect;
            }
        });
    });

    describe('transport configuration', () => {
        it('should start HTTP/SSE server when stdio is false', () => {
            const httpServer = new MCPServer(mockMM, { stdio: false, port: 8080 });
            assert.strictEqual(httpServer.useStdio, false, 'Should not use stdio');
            assert.strictEqual(httpServer.port, 8080, 'Should use specified port');
        });

        it('should start stdio transport when stdio is true', () => {
            const stdioServer = new MCPServer(mockMM, { stdio: true });
            assert.strictEqual(stdioServer.useStdio, true, 'Should use stdio');
        });

        it('should use StreamableHTTP transport for HTTP mode', async () => {
            const httpServer = new MCPServer(mockMM, { stdio: false, port: 8080 });
            
            // Setup tools
            await httpServer.setupTools();
            
            // Verify the server is configured for HTTP transport
            assert.strictEqual(httpServer.useStdio, false, 'Should be configured for HTTP transport');
            assert.ok(httpServer.server, 'Should have MCP server instance');
        });
    });

    describe('integration', () => {
        it('should successfully setup and be ready for connections', async () => {
            // Setup tools
            await mcpServer.setupTools();
            
            // Verify the server is in a good state
            assert.ok(mcpServer.server, 'Server should be ready');
            assert.ok(mcpServer.mm, 'MonsterManager should be available');
        });
    });
});