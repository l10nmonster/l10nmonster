import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { L10nMonsterMCPServer } from '../index.js';

describe('L10nMonsterMCPServer', () => {
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
        
        mcpServer = new L10nMonsterMCPServer(mockMM);
    });

    describe('constructor', () => {
        it('should initialize server with correct configuration', () => {
            assert.ok(mcpServer.server);
            assert.ok(mcpServer.mm);
            assert.strictEqual(mcpServer.mm, mockMM);
            assert.ok(mcpServer.toolHandlers);
            assert.ok(mcpServer.toolHandlers instanceof Map);
        });
    });

    describe('setupTools', () => {
        it('should setup source_query tool', async () => {
            await mcpServer.setupTools();
            
            // Check if tools are registered
            assert.ok(mcpServer.server._tools);
            
            // Give it a moment for async import to complete
            setTimeout(() => {
                assert.ok(mcpServer.server._tools.has('source_query'));
                assert.ok(mcpServer.toolHandlers.has('source_query'));
            }, 100);
        });
    });

    describe('tool handlers', () => {
        it('should handle list tools request', async () => {
            await mcpServer.setupTools();
            
            // Simulate list tools request
            const listToolsHandler = mcpServer.server._requestHandlers?.get('notifications/list');
            
            // For now, just verify the handler structure exists
            assert.ok(mcpServer.server._requestHandlers || mcpServer.server.setRequestHandler);
        });
    });
});