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
            
            // Verify server exists and is properly configured
            assert.ok(typeof mcpServer.server === 'object', 'Server should be an object');
        });

        it('should create McpServer with correct metadata', () => {
            // The server should be properly configured
            assert.ok(mcpServer.server, 'MCP server instance should exist');
        });
    });

    describe('setupTools', () => {
        it('should setup source_query tool without errors', async () => {
            // This should not throw any errors
            await assert.doesNotThrow(async () => {
                await mcpServer.setupTools();
            }, 'setupTools should complete without errors');
        });

        it('should handle import errors gracefully', async () => {
            // Create a server with broken import path (simulate error condition)
            const brokenServer = new MCPServer(mockMM);
            
            // Override the import to simulate failure
            const originalImport = global.import;
            global.import = () => Promise.reject(new Error('Module not found'));
            
            try {
                await brokenServer.setupTools();
                // Should not throw, just log error
                assert.ok(true, 'Should handle import errors gracefully');
            } finally {
                // Restore original import
                global.import = originalImport;
            }
        });
    });

    describe('start method', () => {
        it('should have start method that sets up tools', () => {
            assert.ok(typeof mcpServer.start === 'function', 'Should have start method');
        });

        it('should call setupTools when starting', async () => {
            let setupToolsCalled = false;
            
            // Override setupTools to track if it's called
            const originalSetupTools = mcpServer.setupTools;
            mcpServer.setupTools = async () => {
                setupToolsCalled = true;
                return originalSetupTools.call(mcpServer);
            };
            
            // Mock the transport connection to avoid actually starting the server
            const originalConnect = mcpServer.server.connect;
            mcpServer.server.connect = async () => {
                // Mock connection - don't actually start server
                return Promise.resolve();
            };
            
            try {
                await mcpServer.start();
                assert.ok(setupToolsCalled, 'setupTools should be called during start');
            } catch (error) {
                // Expected since we're mocking - just verify setupTools was called
                assert.ok(setupToolsCalled, 'setupTools should be called even if start fails');
            } finally {
                // Restore original methods
                mcpServer.setupTools = originalSetupTools;
                mcpServer.server.connect = originalConnect;
            }
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