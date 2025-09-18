import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { convertToMcpTool } from '../utils/mcpTools.js';

describe('mcpTools', () => {
    let mockMM, mockAction;

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
        
        mockAction = class source_query {
            static help = {
                summary: 'query sources in the local cache.',
                description: 'query sources in the local cache.',
                arguments: [
                    ['[whereCondition]', 'where condition against sources']
                ],
                requiredOptions: [
                    ['--lang <srcLang,tgtLang>', 'source and target language pair']
                ],
                options: [
                    ['--provider <name,...>', 'use the specified providers'],
                    ['--push', 'push content to providers']
                ]
            };

            static async action(mm, options) {
                const [sourceLang, targetLang] = options.lang.split(',');
                const tm = mm.tmm.getTM(sourceLang, targetLang);
                const tus = tm.querySource(options.whereCondition ?? 'true');
                const jobs = await mm.dispatcher.createJobs({ sourceLang, targetLang, tus });
                return { jobs, total: jobs.length };
            }
        };
    });

    describe('convertToMcpTool', () => {
        it('should convert action to MCP tool with correct properties', () => {
            const tool = convertToMcpTool(mockAction, mockMM);
            
            assert.ok(tool);
            assert.strictEqual(tool.name, 'source_query');
            assert.strictEqual(tool.description, 'query sources in the local cache.');
            assert.ok(tool.inputSchema);
            assert.ok(typeof tool.handler === 'function');
        });

        it('should validate input arguments before calling action', async () => {
            const tool = convertToMcpTool(mockAction, mockMM);
            
            // Valid arguments should work
            const validArgs = {
                lang: 'en,fr',
                whereCondition: 'channel = "mobile"',
                provider: 'openai'
            };
            
            const result = await tool.handler(validArgs);
            assert.ok(result.content);
            assert.strictEqual(result.content[0].type, 'text');
            
            // Invalid arguments should return error (missing required lang)
            const invalidArgs = {
                whereCondition: 'channel = "mobile"'
                // missing required lang
            };
            
            const errorResult = await tool.handler(invalidArgs);
            assert.ok(errorResult.isError);
            assert.ok(errorResult.content[0].text.includes('Error executing'));
        });

        it('should call custom mcpAction if available', async () => {
            let customActionCalled = false;
            
            const actionWithMcp = class source_query {
                static help = mockAction.help;
                
                static async action(mm, options) {
                    return mockAction.action(mm, options);
                }
                
                static async mcpAction(toolName, args, mm) {
                    customActionCalled = true;
                    return {
                        content: [{
                            type: 'text',
                            text: `Custom MCP response for ${toolName}`
                        }]
                    };
                }
            };
            
            const tool = convertToMcpTool(actionWithMcp, mockMM);
            const result = await tool.handler({
                lang: 'en,fr'
            });
            
            assert.ok(customActionCalled);
            assert.ok(result.content[0].text.includes('Custom MCP response'));
        });

        it('should skip actions without help', () => {
            const actionWithoutHelp = class NoHelp {
                static async action() {
                    return 'test';
                }
            };
            
            const tool = convertToMcpTool(actionWithoutHelp, mockMM);
            
            // Should return undefined for actions without help
            assert.strictEqual(tool, undefined);
        });

        it('should format CLI results for MCP', async () => {
            const tool = convertToMcpTool(mockAction, mockMM);
            const result = await tool.handler({
                lang: 'en,fr'
            });
            
            assert.ok(result.content);
            assert.strictEqual(result.content[0].type, 'text');
            
            // Should contain JSON-formatted result
            const text = result.content[0].text;
            assert.ok(text.includes('jobs'));
            assert.ok(text.includes('total'));
        });
    });
});