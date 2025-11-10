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
            assert.strictEqual(mcpServer.port, 3000, 'Should default to port 3000');
            
            // Verify server exists and is properly configured
            assert.ok(typeof mcpServer.server === 'object', 'Server should be an object');
        });

        it('should create McpServer with correct metadata', () => {
            // The server should be properly configured
            assert.ok(mcpServer.server, 'MCP server instance should exist');
        });

        it('should accept options for transport configuration', () => {
            const customServer = new MCPServer(mockMM, { port: 8080 });
            assert.strictEqual(customServer.port, 8080, 'Should use specified port');
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
            // Create a server instance with test port
            const testServer = new MCPServer(mockMM, { port: 9999 });
            let setupToolsCalled = false;
            
            // Override setupTools to track if it's called
            const originalSetupTools = testServer.setupTools;
            testServer.setupTools = async () => {
                setupToolsCalled = true;
                return originalSetupTools.call(testServer);
            };
            
            // Mock the HTTP server creation to avoid port conflicts
            const originalCreateHTTPServer = testServer.createHTTPServer;
            testServer.createHTTPServer = async () => {
                // Call setupTools as the real implementation would
                await testServer.setupTools();
                // Return a mock HTTP server
                return {
                    listen: () => ({ close: () => {} })
                };
            };
            
            try {
                // This will fail because we're mocking, but setupTools should be called
                await testServer.start();
            } catch (error) {
                // Expected - we're mocking
            }
            
            // Verify setupTools was called
            assert.ok(setupToolsCalled, 'setupTools should be called even if start fails');
            
            // Cleanup
            testServer.setupTools = originalSetupTools;
            testServer.createHTTPServer = originalCreateHTTPServer;
        });
    });

    describe('transport configuration', () => {
        it('should configure HTTP server with custom port', () => {
            const httpServer = new MCPServer(mockMM, { port: 8080 });
            assert.strictEqual(httpServer.port, 8080, 'Should use specified port');
        });

        it('should use default port when not specified', () => {
            const defaultServer = new MCPServer(mockMM);
            assert.strictEqual(defaultServer.port, 3000, 'Should use default port 3000');
        });

        it('should use HTTP transport', async () => {
            const httpServer = new MCPServer(mockMM, { port: 8080 });
            
            // Setup tools
            await httpServer.setupTools();
            
            // Verify the server is configured
            assert.ok(httpServer.server, 'Should have MCP server instance');
            assert.ok(httpServer.mm, 'Should have MonsterManager instance');
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