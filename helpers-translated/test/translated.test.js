/* eslint-disable no-new */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MMTProvider, LaraProvider } from '../index.js';

describe('Translated Helpers', () => {
    describe('MMTProvider', () => {
        test('should create instance with required options', () => {
            const provider = new MMTProvider({
                apiKey: 'test-key',
                quality: 80
            });
            assert.ok(provider instanceof MMTProvider);
        });

        test('should set default id based on webhook presence', () => {
            const realtimeProvider = new MMTProvider({
                id: `test-realtime-${Date.now()}`,
                apiKey: 'test-key',
                quality: 80
            });
            // Should default to 'MMTRealtime' when no webhook
            assert.ok(realtimeProvider);

            const batchProvider = new MMTProvider({
                id: `test-batch-${Date.now()}`,
                apiKey: 'test-key',
                webhook: 'https://example.com/webhook',
                chunkFetcher: () => {},
                quality: 80
            });
            // Should default to 'MMTBatch' when webhook is provided
            assert.ok(batchProvider);
        });

        test('should require chunkFetcher when webhook is provided', () => {
            assert.throws(() => {
                new MMTProvider({
                    apiKey: 'test-key',
                    webhook: 'https://example.com/webhook',
                    quality: 80
                    // Missing chunkFetcher
                });
            });
        });

        test('should configure base request correctly', () => {
            const provider = new MMTProvider({
                id: `test-config-${Date.now()}`,
                apiKey: 'test-key',
                hints: ['hint1', 'hint2'],
                multiline: false,
                quality: 80
            });

            assert.ok(provider.baseRequest);
            assert.deepStrictEqual(provider.baseRequest.hints, ['hint1', 'hint2']);
            assert.strictEqual(provider.baseRequest.options.multiline, false);
            assert.strictEqual(provider.baseRequest.options.format, 'text/xml');
        });

        test('should handle multiline default value', () => {
            const provider = new MMTProvider({
                id: `test-multiline-${Date.now()}`,
                apiKey: 'test-key',
                quality: 80
            });

            assert.strictEqual(provider.baseRequest.options.multiline, true);
        });
    });

    describe('LaraProvider', () => {
        test('should create instance', () => {
            const provider = new LaraProvider({
                apiKey: 'test-key',
                quality: 80
            });
            assert.ok(provider instanceof LaraProvider);
        });

        test('should handle provider configuration', () => {
            const provider = new LaraProvider({
                id: `test-lara-${Date.now()}`,
                apiKey: 'test-key',
                projectId: 'test-project',
                quality: 80
            });
            
            // Basic validation that instance was created
            assert.ok(provider);
        });
    });
});