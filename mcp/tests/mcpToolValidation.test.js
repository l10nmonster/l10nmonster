import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
    McpTool,
    McpToolError,
    McpInputError,
    McpNotFoundError,
    McpProviderError
} from '../tools/mcpTool.js';
import { SourceQueryTool } from '../tools/sourceQuery.js';
import { TranslateTool } from '../tools/translate.js';
import { TranslationStatusTool } from '../tools/status.js';

describe('MCP Tool Input Validation and Output', () => {
    let mockMM;
    
    function createMockMM() {
        return {
            rm: {
                channelIds: ['channel1', 'channel2'],
                getActiveContentStats: async () => [],
                getDesiredLangPairs: async () => [['en', 'fr'], ['en', 'es']],
                autoSnap: true
            },
            tmm: {
                getTM: (sourceLang, targetLang) => {
                    if (sourceLang === 'invalid' || targetLang === 'invalid') {
                        throw new Error('Language pair not available');
                    }
                    return {
                        querySource: async () => [
                            {
                                guid: 'guid1',
                                rid: 'test.js',
                                sid: 'hello',
                                nsrc: ['Hello'],
                                ntgt: ['Bonjour'],
                                q: 0.9
                            }
                        ],
                        queryByGuids: async () => [
                            {
                                guid: 'guid1',
                                rid: 'test.js',
                                sid: 'hello',
                                nsrc: ['Hello']
                            }
                        ],
                        getStats: async () => [
                            {
                                translationProvider: 'test-provider',
                                status: 'done',
                                jobCount: 1,
                                tuCount: 10,
                                distinctGuids: 10
                            }
                        ]
                    };
                },
                getAvailableLangPairs: async () => [['en', 'fr'], ['en', 'es']],
                getJobTOCByLangPair: async () => [],
                getJob: async (jobGuid) => ({
                    jobGuid,
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    translationProvider: 'test-provider',
                    status: 'done',
                    tus: [
                        {
                            guid: 'guid1',
                            rid: 'test.js',
                            sid: 'hello',
                            nsrc: ['Hello'],
                            ntgt: ['Bonjour'],
                            q: 0.9,
                            ts: Date.now()
                        }
                    ],
                    inflight: []
                })
            },
            dispatcher: {
                providers: [
                    {
                        id: 'test-provider',
                        info: async () => ({
                            id: 'test-provider',
                            type: 'mt',
                            quality: 'high',
                            supportedPairs: 'any'
                        })
                    }
                ],
                createJobs: async () => [
                    {
                        translationProvider: 'test-provider',
                        jobGuid: 'job-123',
                        tus: [{ guid: 'guid1' }]
                    }
                ],
                startJobs: async () => [
                    {
                        jobGuid: 'job-123',
                        status: 'done'
                    }
                ]
            },
            getTranslationStatus: async () => ({
                channel1: {
                    en: {
                        fr: {
                            prj1: {
                                pairSummary: { segs: 100 },
                                pairSummaryByStatus: {
                                    translated: 80,
                                    untranslated: 20,
                                    'in flight': 0,
                                    'low quality': 0
                                }
                            }
                        }
                    }
                }
            })
        };
    }

    beforeEach(() => {
        mockMM = createMockMM();
    });

    describe('McpTool base class', () => {
        describe('formatResult', () => {
            it('should format object results as JSON content', () => {
                const result = { data: 'test', count: 42 };
                const formatted = McpTool.formatResult(result);
                
                assert.ok(formatted.content);
                assert.strictEqual(formatted.content.length, 1);
                assert.strictEqual(formatted.content[0].type, 'text');
                assert.strictEqual(formatted.content[0].text, JSON.stringify(result, null, 2));
            });

            it('should format string results as text content', () => {
                const result = 'Simple text result';
                const formatted = McpTool.formatResult(result);
                
                assert.ok(formatted.content);
                assert.strictEqual(formatted.content.length, 1);
                assert.strictEqual(formatted.content[0].type, 'text');
                assert.strictEqual(formatted.content[0].text, result);
            });

            it('should pass through MCP-formatted responses', () => {
                const mcpFormatted = {
                    content: [
                        { type: 'text', text: 'Hello' },
                        { type: 'json', json: { data: 'test' } }
                    ]
                };
                const formatted = McpTool.formatResult(mcpFormatted);
                
                assert.deepStrictEqual(formatted, mcpFormatted);
            });

            it('should format number results as text', () => {
                const result = 42;
                const formatted = McpTool.formatResult(result);
                
                assert.strictEqual(formatted.content[0].type, 'text');
                assert.strictEqual(formatted.content[0].text, '42');
            });

            it('should format array results as JSON', () => {
                const result = [1, 2, 3];
                const formatted = McpTool.formatResult(result);
                
                assert.strictEqual(formatted.content[0].type, 'text');
                assert.strictEqual(formatted.content[0].text, JSON.stringify(result, null, 2));
            });
        });

        describe('formatError', () => {
            it('should format McpToolError with all properties', () => {
                const error = new McpToolError('Test error', {
                    code: 'TEST_ERROR',
                    retryable: true,
                    hints: ['Hint 1', 'Hint 2'],
                    details: { key: 'value' }
                });
                
                const formatted = McpTool.formatError(error);
                
                assert.ok(formatted.isError);
                assert.ok(formatted.content);
                assert.strictEqual(formatted.content.length, 2);
                assert.strictEqual(formatted.content[0].type, 'text');
                assert.strictEqual(formatted.content[1].type, 'text');
                
                const payload = JSON.parse(formatted.content[1].text);
                assert.strictEqual(payload.name, 'McpToolError');
                assert.strictEqual(payload.message, 'Test error');
                assert.strictEqual(payload.code, 'TEST_ERROR');
                assert.strictEqual(payload.retryable, true);
                assert.deepStrictEqual(payload.hints, ['Hint 1', 'Hint 2']);
                assert.deepStrictEqual(payload.details, { key: 'value' });
            });

            it('should format ZodError with validation details', () => {
                const schema = z.object({
                    required: z.string(),
                    optional: z.number().optional()
                });
                
                let zodError;
                try {
                    schema.parse({ optional: 'not-a-number' });
                } catch (error) {
                    zodError = error;
                }
                
                const formatted = McpTool.formatError(zodError);
                
                assert.ok(formatted.isError);
                const payload = JSON.parse(formatted.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
                assert.ok(payload.details);
                assert.ok(payload.details.issues);
                assert.ok(Array.isArray(payload.details.issues));
                assert.ok(payload.hints);
            });

            it('should format errors with cause chain', () => {
                const cause = new Error('Root cause');
                const error = new McpToolError('Wrapper error', { cause });
                
                const formatted = McpTool.formatError(error);
                const payload = JSON.parse(formatted.content[1].text);
                
                assert.ok(payload.cause);
                assert.strictEqual(payload.cause.name, 'Error');
                assert.strictEqual(payload.cause.message, 'Root cause');
            });

            it('should wrap unknown errors', () => {
                const error = new Error('Unknown error');
                const formatted = McpTool.formatError(error);
                const payload = JSON.parse(formatted.content[1].text);
                
                assert.strictEqual(payload.code, 'UNKNOWN_ERROR');
                assert.strictEqual(payload.message, 'Unknown error');
            });

            it('should include stack trace when available', () => {
                const error = new Error('Test');
                error.stack = 'Error: Test\n    at test.js:1:1';
                
                const formatted = McpTool.formatError(error);
                const payload = JSON.parse(formatted.content[1].text);
                
                assert.ok(payload.stack);
                // The wrapped error will have its own stack trace, not the original
                assert.ok(payload.stack.includes('McpToolError'));
            });
        });

        describe('handler', () => {
            class TestTool extends McpTool {
                static metadata = {
                    name: 'test_tool',
                    description: 'Test tool',
                    inputSchema: z.object({
                        required: z.string(),
                        optional: z.number().optional()
                    })
                };

                static async execute(mm, args) {
                    return { result: args.required, optional: args.optional };
                }
            }

            it('should validate input before execution', async () => {
                const handler = TestTool.handler(mockMM);
                
                // Valid input
                const validResult = await handler({ required: 'test', optional: 42 });
                assert.ok(validResult.content);
                assert.strictEqual(validResult.content[0].type, 'text');
                const validPayload = JSON.parse(validResult.content[0].text);
                assert.strictEqual(validPayload.result, 'test');
                
                // Invalid input - missing required
                const invalidResult = await handler({ optional: 42 });
                assert.ok(invalidResult.isError);
                const invalidPayload = JSON.parse(invalidResult.content[1].text);
                assert.strictEqual(invalidPayload.code, 'INVALID_INPUT');
            });

            it('should format execution errors', async () => {
                class ErrorTool extends McpTool {
                    static metadata = {
                        name: 'error_tool',
                        description: 'Tool that errors',
                        inputSchema: z.object({})
                    };

                    static async execute() {
                        throw new Error('Execution failed');
                    }
                }

                const handler = ErrorTool.handler(mockMM);
                const result = await handler({});
                
                assert.ok(result.isError);
                assert.ok(result.content[0].text.includes('Error executing error_tool'));
            });
        });
    });

    describe('SourceQueryTool', () => {
        describe('input validation', () => {
            it('should accept valid language pair format', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'channel1'
                });
                
                assert.ok(!result.isError);
                assert.ok(result.content);
            });

            it('should reject invalid language pair format', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                
                // Missing sourceLang
                const result1 = await handler({
                    targetLang: 'fr',
                    channel: 'channel1'
                });
                assert.ok(result1.isError);
                
                // Missing targetLang
                const result2 = await handler({
                    sourceLang: 'en',
                    channel: 'channel1'
                });
                assert.ok(result2.isError);
            });

            it('should require channel parameter', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr'
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
            });

            it('should accept optional whereCondition', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                
                // Without whereCondition
                const result1 = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'channel1'
                });
                assert.ok(!result1.isError);
                
                // With whereCondition
                const result2 = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'channel1',
                    whereCondition: 'rid = "test.js"'
                });
                assert.ok(!result2.isError);
            });

            it('should reject empty channel', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: ''
                });
                
                // Empty string should fail Zod validation (string().min(1) implicit)
                assert.ok(result.isError);
            });
        });

        describe('error handling', () => {
            it('should handle non-existent channel', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'nonexistent'
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'NOT_FOUND');
                assert.ok(payload.hints);
            });

            it('should handle invalid language pair', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'invalid',
                    targetLang: 'invalid',
                    channel: 'channel1'
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
            });

            it('should handle query failures', async () => {
                const localMM = createMockMM();
                localMM.tmm.getTM = () => ({
                    querySource: async () => {
                        throw new Error('SQL syntax error');
                    }
                });
                
                const handler = SourceQueryTool.handler(localMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'channel1',
                    whereCondition: 'invalid SQL'
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'QUERY_FAILED');
                assert.ok(payload.hints);
            });
        });

        describe('output format', () => {
            it('should return structured result with translation units', async () => {
                const handler = SourceQueryTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'channel1'
                });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.sourceLang);
                assert.ok(json.targetLang);
                assert.ok(Array.isArray(json.translationUnits));
                assert.ok(typeof json.message === 'string');
            });

            it('should return empty array message when no results', async () => {
                const localMM = createMockMM();
                localMM.tmm.getTM = () => ({
                    querySource: async () => []
                });
                
                const handler = SourceQueryTool.handler(localMM);
                const result = await handler({
                    sourceLang: 'en',
                    targetLang: 'fr',
                    channel: 'channel1'
                });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.strictEqual(json.translationUnits.length, 0);
                assert.ok(json.message.includes('No content'));
            });
        });
    });

    describe('TranslateTool', () => {
        describe('input validation', () => {
            it('should accept all required parameters', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(!result.isError);
            });

            it('should require sourceLang', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
            });

            it('should require targetLang', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
            });

            it('should require channelId', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
            });

            it('should require provider', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
            });

            it('should require at least one guid', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: []
                });
                
                assert.ok(result.isError);
            });

            it('should accept optional instructions', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1'],
                    instructions: 'Translate carefully'
                });
                
                assert.ok(!result.isError);
            });

            it('should accept array of guids', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1', 'guid2', 'guid3']
                });
                
                assert.ok(!result.isError);
            });
        });

        describe('error handling', () => {
            it('should handle unknown provider', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'unknown-provider',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
                assert.ok(payload.hints);
            });

            it('should handle invalid language pair', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'invalid',
                    targetLang: 'invalid',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
            });

            it('should handle missing translation units', async () => {
                const localMM = createMockMM();
                localMM.tmm.getTM = () => ({
                    queryByGuids: async () => []
                });
                
                const handler = TranslateTool.handler(localMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['nonexistent-guid']
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'NOT_FOUND');
            });

            it('should handle provider rejection', async () => {
                // Mock TU conversion to fail by returning invalid TU data (missing required fields)
                const localMM = createMockMM();
                localMM.tmm.getTM = () => ({
                    queryByGuids: async () => [
                        {
                            guid: 'guid1',
                            // Missing rid and sid which are required fields
                            nsrc: ['Hello']
                        }
                    ]
                });
                
                const handler = TranslateTool.handler(localMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'SOURCE_TU_CONVERSION_FAILED');
            });
        });

        describe('output format', () => {
            it('should return structured translation result', async () => {
                const handler = TranslateTool.handler(mockMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1']
                });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.jobGuid);
                assert.strictEqual(json.sourceLang, 'en-US');
                assert.strictEqual(json.targetLang, 'fr-FR');
                assert.ok(typeof json.translatedCount === 'number');
                assert.ok(Array.isArray(json.translatedTUs));
            });

            it('should include inflight guids when present', async () => {
                const localMM = createMockMM();
                localMM.tmm.getJob = async () => ({
                    jobGuid: 'job-123',
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    translationProvider: 'test-provider',
                    status: 'done',
                    tus: [
                        {
                            guid: 'guid1',
                            nsrc: ['Hello'],
                            ntgt: ['Bonjour'],
                            q: 0.9,
                            ts: Date.now()
                        }
                    ],
                    inflight: ['guid2']
                });
                
                const handler = TranslateTool.handler(localMM);
                const result = await handler({
                    sourceLang: 'en-US',
                    targetLang: 'fr-FR',
                    channelId: 'channel1',
                    provider: 'test-provider',
                    guids: ['guid1', 'guid2']
                });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.inflightGuids);
                assert.strictEqual(json.inflightCount, 1);
            });
        });
    });

    describe('TranslationStatusTool', () => {
        describe('input validation', () => {
            it('should accept valid detailLevel enum', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                
                const result1 = await handler({ detailLevel: 'summary' });
                assert.ok(!result1.isError);
                
                const result2 = await handler({ detailLevel: 'detailed' });
                assert.ok(!result2.isError);
            });

            it('should reject invalid detailLevel', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ detailLevel: 'invalid' });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'INVALID_INPUT');
            });

            it('should default detailLevel to summary', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({});
                
                assert.ok(!result.isError);
            });

            it('should accept valid include array', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                
                const result1 = await handler({ include: ['jobs'] });
                assert.ok(!result1.isError);
                
                const result2 = await handler({ include: ['coverage', 'providers'] });
                assert.ok(!result2.isError);
                
                const result3 = await handler({ include: ['jobs', 'coverage', 'providers'] });
                assert.ok(!result3.isError);
            });

            it('should reject invalid include values', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ include: ['invalid'] });
                
                assert.ok(result.isError);
            });

            it('should default include to channels, providers, and languagePairs', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({});
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.channels);
                assert.ok(json.providers);
                assert.ok(json.languagePairs);
                // Coverage and translationMemory are not included by default
                assert.ok(!json.coverage);
                assert.ok(!json.translationMemory);
            });

            it('should accept optional filters', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                
                const result1 = await handler({ channel: 'channel1' });
                assert.ok(!result1.isError);
                
                const result2 = await handler({ provider: 'test-provider' });
                assert.ok(!result2.isError);
                
                const result3 = await handler({ sourceLang: 'en' });
                assert.ok(!result3.isError);
                
                const result4 = await handler({ targetLang: 'fr' });
                assert.ok(!result4.isError);
            });

            it('should accept all filters together', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({
                    detailLevel: 'detailed',
                    include: ['jobs', 'coverage'],
                    channel: 'channel1',
                    provider: 'test-provider',
                    sourceLang: 'en',
                    targetLang: 'fr'
                });
                
                assert.ok(!result.isError);
            });
        });

        describe('error handling', () => {
            it('should handle non-existent channel', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ channel: 'nonexistent' });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'NOT_FOUND');
            });

            it('should handle non-existent provider', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ 
                    include: ['providers'],
                    provider: 'nonexistent' 
                });
                
                assert.ok(result.isError);
                const payload = JSON.parse(result.content[1].text);
                assert.strictEqual(payload.code, 'NOT_FOUND');
            });
        });

        describe('output format', () => {
            it('should return structured status with required fields', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({
                    include: ['channels', 'languagePairs', 'translationMemory']
                });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.timestamp);
                assert.ok(json.channels);
                assert.ok(json.languagePairs);
                assert.ok(json.translationMemory);
            });

            it('should include coverage when requested', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ include: ['coverage'] });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.coverage);
            });

            it('should include jobs when requested', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ include: ['jobs'] });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.jobs !== undefined);
            });

            it('should include providers when requested', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ include: ['providers'] });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.providers);
            });

            it('should include details when detailLevel is detailed', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ detailLevel: 'detailed' });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(json.details);
            });

            it('should not include details when detailLevel is summary', async () => {
                const handler = TranslationStatusTool.handler(mockMM);
                const result = await handler({ detailLevel: 'summary' });
                
                assert.ok(!result.isError);
                const json = JSON.parse(result.content[0].text);
                assert.ok(!json.details);
            });
        });
    });

    describe('Error class hierarchy', () => {
        it('should create McpInputError with correct code', () => {
            const error = new McpInputError('Invalid input');
            assert.strictEqual(error.code, 'INVALID_INPUT');
            assert.strictEqual(error.message, 'Invalid input');
        });

        it('should create McpNotFoundError with correct code', () => {
            const error = new McpNotFoundError('Not found');
            assert.strictEqual(error.code, 'NOT_FOUND');
            assert.strictEqual(error.message, 'Not found');
        });

        it('should create McpProviderError with correct code', () => {
            const error = new McpProviderError('Provider error');
            assert.strictEqual(error.code, 'PROVIDER_ERROR');
            assert.strictEqual(error.message, 'Provider error');
        });

        it('should wrap non-McpToolError errors', () => {
            const originalError = new Error('Original error');
            const wrapped = McpToolError.wrap(originalError, { code: 'CUSTOM' });
            
            assert.ok(wrapped instanceof McpToolError);
            assert.strictEqual(wrapped.code, 'CUSTOM');
            assert.strictEqual(wrapped.cause, originalError);
        });

        it('should not wrap McpToolError errors', () => {
            const mcpError = new McpInputError('Already wrapped');
            const wrapped = McpToolError.wrap(mcpError);
            
            assert.strictEqual(wrapped, mcpError);
        });
    });
});

