/* eslint-disable no-new */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { AnthropicAgent } from '../anthropicAgent.js';

// Mock the dependencies
mock.method(console, 'log', () => {}); // Suppress log output during tests

describe('AnthropicAgent', () => {
    let mockOptions;

    beforeEach(() => {
        mockOptions = {
            id: `test-agent-${Math.random().toString(36).substr(2, 9)}`, // Unique ID for each test
            model: 'claude-3-5-sonnet@20241022',
            quality: 85,
            temperature: 0.2,
            maxTokens: 2048,
            vertexProject: 'test-project',
            vertexLocation: 'us-central1'
        };
    });

    describe('Constructor', () => {
        it('should create an instance with valid options', () => {
            const agent = new AnthropicAgent(mockOptions);
            assert.ok(agent instanceof AnthropicAgent);
            assert.strictEqual(agent.model, 'claude-3-5-sonnet@20241022');
            assert.strictEqual(agent.temperature, 0.2);
        });

        it('should throw error when model is missing', () => {
            const invalidOptions = { ...mockOptions };
            delete invalidOptions.model;
            
            assert.throws(() => {
                new AnthropicAgent(invalidOptions);
            }, /You must specify quality/);
        });

        it('should throw error when quality is missing', () => {
            const invalidOptions = { ...mockOptions };
            delete invalidOptions.quality;
            
            assert.throws(() => {
                new AnthropicAgent(invalidOptions);
            }, /You must specify quality/);
        });

        it('should use default values for optional parameters', () => {
            const minimalOptions = {
                id: 'test-minimal-agent',
                model: 'claude-3-5-haiku@20241022',
                quality: 80
            };
            const agent = new AnthropicAgent(minimalOptions);
            assert.strictEqual(agent.temperature, 0.1); // default
        });

        it('should support direct API configuration', () => {
            const apiOptions = {
                id: 'test-api-agent',
                model: 'claude-3-5-sonnet-latest',
                quality: 85,
                apiKey: 'test-api-key',
                maxRetries: 5
            };
            const agent = new AnthropicAgent(apiOptions);
            assert.strictEqual(agent.model, 'claude-3-5-sonnet-latest');
            // Note: maxRetries is passed to Anthropic SDK internally
        });

        it('should handle vertex AI configuration', () => {
            const vertexOptions = {
                id: 'test-vertex-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                vertexProject: 'my-project',
                vertexLocation: 'us-east1'
            };
            const agent = new AnthropicAgent(vertexOptions);
            assert.strictEqual(agent.model, 'claude-3-5-sonnet@20241022');
        });

        it('should handle custom maxRetries for SDK configuration', () => {
            const customOptions = {
                id: 'test-retry-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                maxRetries: 5,
                apiKey: 'test-key'
            };
            const agent = new AnthropicAgent(customOptions);
            // maxRetries is passed to the SDK, not directly accessible
            assert.ok(agent instanceof AnthropicAgent);
        });

        it('should handle custom persona and schema', () => {
            const customOptions = {
                id: 'test-custom-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                persona: 'Custom translator persona',
                customSchema: { type: 'object', properties: { test: { type: 'string' } } }
            };
            const agent = new AnthropicAgent(customOptions);
            assert.ok(agent.systemPrompt.includes('Custom translator persona'));
            assert.strictEqual(agent.customSchema, customOptions.customSchema);
        });
    });

    describe('prepareTranslateChunkArgs', () => {
        let agent;

        beforeEach(() => {
            agent = new AnthropicAgent(mockOptions);
        });

        it('should prepare correct arguments for translation', () => {
            const chunkArgs = {
                sourceLang: 'en',
                targetLang: 'es',
                xmlTus: [
                    { key: 'test1', source: 'Hello', notes: 'Greeting' },
                    { key: 'test2', source: 'World', notes: 'Noun' }
                ],
                instructions: 'Be formal'
            };

            const args = agent.prepareTranslateChunkArgs(chunkArgs);

            assert.strictEqual(args.model, 'claude-3-5-sonnet@20241022');
            assert.strictEqual(args.max_tokens, 2048);
            assert.strictEqual(args.temperature, 0.2);
            assert.ok(args.system.includes('You are one of the best professional translators'));
            assert.ok(Array.isArray(args.messages));
            assert.strictEqual(args.messages.length, 1);
            assert.strictEqual(args.messages[0].role, 'user');
            assert.ok(args.messages[0].content.includes('Be formal'));
            assert.ok(args.messages[0].content.includes('Hello'));
            assert.ok(args.tools);
            assert.ok(args.tool_choice);
        });

        it('should handle custom schema in tool configuration', () => {
            const customSchema = {
                type: 'object',
                properties: {
                    custom_translation: { type: 'string' },
                    custom_score: { type: 'number' }
                }
            };
            
            const agentWithCustomSchema = new AnthropicAgent({
                id: 'test-schema-tool-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                customSchema
            });

            const chunkArgs = {
                sourceLang: 'en',
                targetLang: 'fr',
                xmlTus: [{ key: 'test', source: 'Test' }],
                instructions: undefined
            };

            const args = agentWithCustomSchema.prepareTranslateChunkArgs(chunkArgs);
            
            assert.strictEqual(args.tools[0].name, 'provide_custom_translations');
            assert.strictEqual(args.tool_choice.name, 'provide_custom_translations');
            assert.deepStrictEqual(args.tools[0].input_schema.properties.translations.items, customSchema);
        });

        it('should use default translation tool when no custom schema', () => {
            const chunkArgs = {
                sourceLang: 'en',
                targetLang: 'de',
                xmlTus: [{ key: 'test', source: 'Test' }],
                instructions: undefined
            };

            const args = agent.prepareTranslateChunkArgs(chunkArgs);
            
            assert.strictEqual(args.tools[0].name, 'provide_translations');
            assert.strictEqual(args.tool_choice.name, 'provide_translations');
            assert.ok(args.tools[0].input_schema.properties.translations.items.properties.translation);
            assert.ok(args.tools[0].input_schema.properties.translations.items.properties.confidence);
            assert.ok(args.tools[0].input_schema.properties.translations.items.properties.notes);
        });
    });

    describe('convertTranslationResponse', () => {
        let agent;

        beforeEach(() => {
            agent = new AnthropicAgent(mockOptions);
        });

        it('should convert valid response with tool use', () => {
            const mockResponse = {
                stop_reason: 'tool_use',
                content: [
                    {
                        type: 'tool_use',
                        input: {
                            translations: [
                                { translation: 'Hola', confidence: 95, notes: 'Standard greeting' },
                                { translation: 'Mundo', confidence: 90, notes: 'Common noun' }
                            ]
                        }
                    }
                ],
                usage: {
                    input_tokens: 100,
                    output_tokens: 50
                }
            };

            const result = agent.convertTranslationResponse(mockResponse);
            
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].tgt, 'Hola');
            assert.strictEqual(result[0].tconf, 95);
            assert.strictEqual(result[0].tnotes, 'Standard greeting');
            assert.strictEqual(result[1].tgt, 'Mundo');
            assert.ok(Array.isArray(result[0].cost));
            assert.strictEqual(result[0].cost.length, 3); // input, output, total tokens
        });

        it('should handle custom schema response', () => {
            const customSchema = { type: 'object', properties: { value: { type: 'string' } } };
            const agentWithCustomSchema = new AnthropicAgent({
                id: 'test-schema-response-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                customSchema
            });

            const mockResponse = {
                stop_reason: 'tool_use',
                content: [
                    {
                        type: 'tool_use',
                        input: {
                            translations: [
                                { value: 'Custom translation' }
                            ]
                        }
                    }
                ],
                usage: {
                    input_tokens: 50,
                    output_tokens: 25
                }
            };

            const result = agentWithCustomSchema.convertTranslationResponse(mockResponse);
            
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].tgt, JSON.stringify({ value: 'Custom translation' }));
        });

        it('should return empty array on invalid stop reason', () => {
            const mockResponse = {
                stop_reason: 'max_tokens',
                content: [],
                usage: { input_tokens: 100, output_tokens: 0 }
            };

            const result = agent.convertTranslationResponse(mockResponse);
            assert.strictEqual(result.length, 0);
        });

        it('should return empty array when no tool use found', () => {
            const mockResponse = {
                stop_reason: 'tool_use',
                content: [
                    { type: 'text', text: 'Some text response' }
                ],
                usage: { input_tokens: 100, output_tokens: 50 }
            };

            const result = agent.convertTranslationResponse(mockResponse);
            assert.strictEqual(result.length, 0);
        });

        it('should return empty array on malformed response', () => {
            const mockResponse = {
                stop_reason: 'tool_use',
                content: [
                    {
                        type: 'tool_use',
                        input: {
                            translations: 'not an array'
                        }
                    }
                ],
                usage: { input_tokens: 100, output_tokens: 50 }
            };

            const result = agent.convertTranslationResponse(mockResponse);
            assert.strictEqual(result.length, 0);
        });
    });

    describe('System Prompt', () => {
        it('should include default persona when none provided', () => {
            const agent = new AnthropicAgent(mockOptions);
            assert.ok(agent.systemPrompt.includes('You are one of the best professional translators'));
        });

        it('should include custom persona when provided', () => {
            const customOptions = {
                id: 'test-persona-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                persona: 'You are a technical translator specializing in software'
            };
            const agent = new AnthropicAgent(customOptions);
            assert.ok(agent.systemPrompt.includes('You are a technical translator specializing in software'));
        });

        it('should include default schema instructions when no custom schema', () => {
            const agent = new AnthropicAgent(mockOptions);
            assert.ok(agent.systemPrompt.includes('HTML tags'));
            assert.ok(agent.systemPrompt.includes('confidence score'));
        });

        it('should include default schema instructions even with custom schema', () => {
            const customOptions = {
                id: 'test-schema-instructions-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                customSchema: { type: 'object', properties: { test: { type: 'string' } } }
            };
            const agent = new AnthropicAgent(customOptions);
            // Should still include the default HTML tags instruction
            assert.ok(agent.systemPrompt.includes('HTML tags'));
        });
    });

    describe('User Prompt Building', () => {
        let agent;

        beforeEach(() => {
            agent = new AnthropicAgent(mockOptions);
        });

        it('should build user prompt with job instructions', () => {
            const promptOptions = {
                sourceLang: 'en',
                targetLang: 'es',
                xmlTus: [{ key: 'test', source: 'Hello world' }],
                instructions: 'Use formal tone'
            };

            const prompt = agent.buildUserPrompt(promptOptions);
            
            assert.ok(prompt.includes('Use formal tone'));
            assert.ok(prompt.includes('Source language: en'));
            assert.ok(prompt.includes('Target language: es'));
            assert.ok(prompt.includes('Hello world'));
            assert.ok(prompt.includes('Number of segments: 1'));
        });

        it('should build user prompt without job instructions', () => {
            const promptOptions = {
                sourceLang: 'fr',
                targetLang: 'de',
                xmlTus: [
                    { key: 'test1', source: 'Bonjour' },
                    { key: 'test2', source: 'Au revoir' }
                ]
            };

            const prompt = agent.buildUserPrompt(promptOptions);
            
            assert.ok(prompt.includes('Source language: fr'));
            assert.ok(prompt.includes('Target language: de'));
            assert.ok(prompt.includes('Bonjour'));
            assert.ok(prompt.includes('Au revoir'));
            assert.ok(prompt.includes('Number of segments: 2'));
            assert.ok(!prompt.includes('Consider also the following instructions'));
        });
    });

    describe('Property Getters', () => {
        let agent;

        beforeEach(() => {
            agent = new AnthropicAgent(mockOptions);
        });

        it('should return correct model', () => {
            assert.strictEqual(agent.model, 'claude-3-5-sonnet@20241022');
        });

        it('should return correct temperature', () => {
            assert.strictEqual(agent.temperature, 0.2);
        });

        it('should return system prompt', () => {
            assert.ok(typeof agent.systemPrompt === 'string');
            assert.ok(agent.systemPrompt.length > 0);
        });

        it('should return custom schema when provided', () => {
            const customSchema = { type: 'object' };
            const agentWithSchema = new AnthropicAgent({
                id: 'test-schema-getter-agent',
                model: 'claude-3-5-sonnet@20241022',
                quality: 85,
                customSchema
            });
            assert.strictEqual(agentWithSchema.customSchema, customSchema);
        });

        it('should return undefined for custom schema when not provided', () => {
            assert.strictEqual(agent.customSchema, undefined);
        });
    });
}); 