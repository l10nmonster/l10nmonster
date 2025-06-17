import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GPTAgent } from '../index.js';

describe('GPTAgent', () => {
    it('should support retry configuration', () => {
        const agent = new GPTAgent({
            id: 'test-retry-gpt',
            model: 'gpt-4',
            quality: 85,
            maxRetries: 5,
            sleepBasePeriod: 1000,
            apiKey: 'test-key'
        });

        assert.strictEqual(agent.maxRetries, 5);
        assert.strictEqual(agent.sleepBasePeriod, 1000);
    });

    it('should use default retry configuration', () => {
        const agent = new GPTAgent({
            id: 'test-default-gpt',
            model: 'gpt-3.5-turbo',
            quality: 80,
            apiKey: 'test-key'
        });

        assert.strictEqual(agent.maxRetries, 2); // default
        assert.strictEqual(agent.sleepBasePeriod, 3000); // default
    });

    it('should implement required methods', () => {
        const agent = new GPTAgent({
            id: 'test-methods-gpt',
            model: 'gpt-4o',
            quality: 90,
            apiKey: 'test-key'
        });

        // Test that all required methods exist
        assert.ok(typeof agent.lazyInit === 'function');
        assert.ok(typeof agent.generateContent === 'function');
        assert.ok(typeof agent.prepareTranslateChunkArgs === 'function');
        assert.ok(typeof agent.convertTranslationResponse === 'function');
        assert.ok(typeof agent.startTranslateChunk === 'function'); // from base class
    });

    it('should prepare correct arguments', () => {
        const agent = new GPTAgent({
            id: 'test-args-gpt',
            model: 'gpt-4-turbo',
            quality: 85,
            temperature: 0.3,
            apiKey: 'test-key'
        });

        const args = agent.prepareTranslateChunkArgs({
            sourceLang: 'en',
            targetLang: 'fr',
            xmlTus: [
                { key: 'greeting', source: 'Hello', notes: 'Informal greeting' }
            ],
            instructions: 'Use casual tone'
        });

        assert.strictEqual(args.model, 'gpt-4-turbo');
        assert.strictEqual(args.temperature, 0.3);
        assert.strictEqual(args.messages.length, 2);
        assert.strictEqual(args.messages[0].role, 'system');
        assert.strictEqual(args.messages[1].role, 'user');
        assert.ok(args.messages[1].content.includes('Use casual tone'));
        assert.ok(args.messages[1].content.includes('Hello'));
        assert.ok(args.response_format);
    });

    it('should handle custom baseURL', () => {
        const agent = new GPTAgent({
            id: 'test-base-url-gpt',
            model: 'gpt-4',
            quality: 85,
            baseURL: 'https://custom.openai-proxy.com/v1',
            apiKey: 'test-key'
        });

        // The baseURL should be stored and used during lazy initialization
        assert.ok(agent); // Just verify it constructs without error
    });

    it('should process translations correctly', () => {
        const agent = new GPTAgent({
            id: 'test-process-gpt',
            model: 'gpt-4',
            quality: 85,
            apiKey: 'test-key'
        });

        const mockResponse = {
            choices: [{
                message: {
                    parsed: [
                        { translation: 'Bonjour', confidence: 95, notes: 'Standard greeting' },
                        { translation: 'Monde', confidence: 90, notes: '' }
                    ]
                }
            }],
            usage: {
                total_tokens: 100
            }
        };

        const result = agent.convertTranslationResponse(mockResponse);
        
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].tgt, 'Bonjour');
        assert.strictEqual(result[0].tconf, 95);
        assert.strictEqual(result[0].tnotes, 'Standard greeting');
        assert.strictEqual(result[1].tgt, 'Monde');
        assert.strictEqual(result[1].tconf, 90);
        assert.deepStrictEqual(result[0].cost, [50]); // 100 tokens / 2 translations
    });
}); 