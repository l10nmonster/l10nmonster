import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnthropicAgent } from '../index.js';

// Import from relative path since we can't rely on workspace in tests
import { providers } from '../../core/index.js';

describe('AnthropicAgent Integration', () => {
    it('should properly extend LLMTranslationProvider', () => {
        const agent = new AnthropicAgent({
            id: 'test-inheritance-agent',
            model: 'claude-3-5-haiku@20241022',
            quality: 75
        });

        // Test inheritance chain
        assert.ok(agent instanceof providers.LLMTranslationProvider);
        assert.ok(agent instanceof providers.ChunkedRemoteTranslationProvider);
        assert.ok(agent instanceof providers.BaseTranslationProvider);
    });

    it('should implement all required methods', () => {
        const agent = new AnthropicAgent({
            id: 'test-methods-agent',
            model: 'claude-3-5-sonnet@20241022',
            quality: 85
        });

        // Test that all required methods exist
        assert.ok(typeof agent.prepareTranslateChunkArgs === 'function');
        assert.ok(typeof agent.startTranslateChunk === 'function');
        assert.ok(typeof agent.generateContent === 'function');
        assert.ok(typeof agent.lazyInit === 'function');
        assert.ok(typeof agent.convertTranslationResponse === 'function');
        assert.ok(typeof agent.info === 'function');
        
        // Test inherited methods from LLMTranslationProvider
        assert.ok(typeof agent.buildUserPrompt === 'function');
        assert.ok(typeof agent.buildSystemPrompt === 'function');
        assert.ok(typeof agent.processTranslations === 'function');
        assert.ok(typeof agent.extractTargetText === 'function');
    });

    it('should have correct property accessors', () => {
        const agent = new AnthropicAgent({
            id: 'test-properties-agent',
            model: 'claude-3-opus@20240229',
            quality: 90,
            temperature: 0.3,
            persona: 'Test persona'
        });

        assert.strictEqual(agent.model, 'claude-3-opus@20240229');
        assert.strictEqual(agent.temperature, 0.3);
        assert.ok(agent.systemPrompt.includes('Test persona'));
        assert.strictEqual(agent.customSchema, undefined);
    });

    it('should support retry configuration', () => {
        const agent = new AnthropicAgent({
            id: 'test-retry-config-agent',
            model: 'claude-3-5-sonnet@20241022',
            quality: 85,
            maxRetries: 5,
            apiKey: 'test-key'
        });

        // maxRetries is passed to the SDK, but properties are still inherited
        assert.strictEqual(agent.maxRetries, 5);
        // Note: AnthropicAgent uses native SDK retry, so sleepBasePeriod is not used
    });

    it('should use default retry configuration when not specified', () => {
        const agent = new AnthropicAgent({
            id: 'test-default-retry-agent',
            model: 'claude-3-5-haiku@20241022',
            quality: 80
        });

        assert.strictEqual(agent.maxRetries, 3); // default from parent class
        assert.strictEqual(agent.sleepBasePeriod, 3000); // default from parent class
    });

    it('should support custom schema configuration', () => {
        const customSchema = {
            type: 'object',
            properties: {
                translated_text: { type: 'string' },
                quality_score: { type: 'number' }
            }
        };

        const agent = new AnthropicAgent({
            id: 'test-custom-schema-agent',
            model: 'claude-3-5-haiku@20241022',
            quality: 80,
            customSchema
        });

        assert.deepStrictEqual(agent.customSchema, customSchema);
        
        // Test that extractTargetText works with custom schema
        const testObj = { translated_text: 'Hello', quality_score: 95 };
        const result = agent.extractTargetText(testObj);
        assert.strictEqual(result, JSON.stringify(testObj));
    });

    it('should process translations correctly', () => {
        const agent = new AnthropicAgent({
            id: 'test-translations-agent',
            model: 'claude-3-5-sonnet@20241022',
            quality: 85
        });

        const translations = [
            { translation: 'Hola', confidence: 95, notes: 'Greeting' },
            { translation: 'Mundo', confidence: 90, notes: 'Noun' }
        ];
        const cost = [10, 5, 15]; // input, output, total

        const result = agent.processTranslations(translations, cost);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].tgt, 'Hola');
        assert.strictEqual(result[0].tconf, 95);
        assert.strictEqual(result[0].tnotes, 'Greeting');
        assert.deepStrictEqual(result[0].cost, cost);
        
        assert.strictEqual(result[1].tgt, 'Mundo');
        assert.strictEqual(result[1].tconf, 90);
        assert.strictEqual(result[1].tnotes, 'Noun');
        assert.deepStrictEqual(result[1].cost, cost);
    });

    it('should handle default configuration values', () => {
        const agent = new AnthropicAgent({
            id: 'test-defaults-agent',
            model: 'claude-3-5-haiku@20241022',
            quality: 80
        });

        // Test default values
        assert.strictEqual(agent.temperature, 0.1);
        assert.ok(agent.systemPrompt.includes('You are one of the best professional translators'));
        assert.ok(agent.systemPrompt.includes('HTML tags'));
    });

    it('should validate required parameters', () => {
        // Missing model
        assert.throws(() => {
            new AnthropicAgent({ quality: 80 });
        }, /You must specify quality and model/);

        // Missing quality
        assert.throws(() => {
            new AnthropicAgent({ model: 'claude-3-5-sonnet@20241022' });
        }, /You must specify quality and model/);

        // Both missing
        assert.throws(() => {
            new AnthropicAgent({});
        }, /You must specify quality and model/);
    });

    it('should test abstract methods in base class', () => {
        // Create a minimal implementation that doesn't override abstract methods
        class TestLLMProvider extends providers.LLMTranslationProvider {
            constructor() {
                super({
                    id: 'test-abstract-provider',
                    model: 'test-model',
                    quality: 80
                });
            }
        }

        const provider = new TestLLMProvider();

        // Test that abstract methods throw errors
        assert.rejects(async () => {
            await provider.lazyInit();
        }, /lazyInit not implemented in TestLLMProvider/);

        assert.rejects(async () => {
            await provider.generateContent({});
        }, /generateContent not implemented in TestLLMProvider/);
    });
}); 