import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DeepLProvider } from '../index.js';

describe('DeepL Provider', () => {
    test('should create instance with required options', () => {
        const provider = new DeepLProvider({
            authKey: 'test-key',
            quality: 80
        });
        assert.ok(provider instanceof DeepLProvider);
    });

    test('should prepare translation chunk args correctly', () => {
        // Create unique provider to avoid registry conflicts
        const provider = new DeepLProvider({
            id: `test-provider-${Date.now()}`,
            authKey: 'test-key',
            formalityMap: { 'de': 'more' },
            modelType: 'quality_optimized',
            quality: 80
        });

        const args = provider.prepareTranslateChunkArgs({
            sourceLang: 'en',
            targetLang: 'de',
            xmlTus: [{ source: 'Hello world' }, { source: 'Good morning' }],
            instructions: 'Be formal'
        });

        assert.deepStrictEqual(args.payload, ['Hello world', 'Good morning']);
        assert.strictEqual(args.sourceLang, 'en');
        assert.strictEqual(args.targetLang, 'de');
        assert.strictEqual(args.options.tagHandling, 'xml');
        assert.strictEqual(args.options.formality, 'more');
        assert.strictEqual(args.options.modelType, 'quality_optimized');
        assert.ok(args.options.context.includes('Be formal'));
    });

    test('should convert translation response correctly', () => {
        const provider = new DeepLProvider({
            id: `test-convert-${Date.now()}`,
            authKey: 'test-key',
            quality: 80
        });

        const mockResponse = [
            { text: 'Hallo Welt', billedCharacters: 10 },
            { text: 'Guten Morgen', billedCharacters: 12 }
        ];

        const result = provider.convertTranslationResponse(mockResponse);

        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].tgt, 'Hallo Welt');
        assert.deepStrictEqual(result[0].cost, [10]);
        assert.strictEqual(result[1].tgt, 'Guten Morgen');
        assert.deepStrictEqual(result[1].cost, [12]);
    });

    test('should handle missing formality mapping', () => {
        const provider = new DeepLProvider({
            id: `test-formality-${Date.now()}`,
            authKey: 'test-key',
            quality: 80
        });

        const args = provider.prepareTranslateChunkArgs({
            sourceLang: 'en',
            targetLang: 'fr',
            xmlTus: [{ source: 'Hello' }]
        });

        assert.strictEqual(args.options.formality, undefined);
    });
});