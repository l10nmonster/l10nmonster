import { test, describe } from 'node:test';
import assert from 'node:assert';
import { XliffBridge } from '../xliffBridge.js';

describe('XLIFF Helpers', () => {
    describe('XliffBridge', () => {
        test('should throw error without required parameters', () => {
            assert.throws(() => {
                new XliffBridge({});
            });
        });

        test('should create instance with required parameters', () => {
            const bridge = new XliffBridge({
                requestPath: (lang, guid) => `request/${lang}/${guid}.xliff`,
                completePath: (lang, guid) => `complete/${lang}/${guid}.xliff`,
                quality: 80
            });
            
            assert.ok(bridge instanceof XliffBridge);
            assert.strictEqual(bridge.quality, 80);
            assert.strictEqual(typeof bridge.requestPath, 'function');
            assert.strictEqual(typeof bridge.completePath, 'function');
        });

        test('should validate path functions work correctly', () => {
            const bridge = new XliffBridge({
                requestPath: (lang, guid) => `request/${lang}/${guid}.xliff`,
                completePath: (lang, guid) => `complete/${lang}/${guid}.xliff`,
                quality: 80
            });

            const requestPath = bridge.requestPath('de', 'test-guid');
            const completePath = bridge.completePath('de', 'test-guid');

            assert.strictEqual(requestPath, 'request/de/test-guid.xliff');
            assert.strictEqual(completePath, 'complete/de/test-guid.xliff');
        });

        test('should handle quality parameter correctly', () => {
            const bridge = new XliffBridge({
                requestPath: (lang, guid) => `${lang}/${guid}.xliff`,
                completePath: (lang, guid) => `${lang}/${guid}_complete.xliff`,
                quality: 95
            });

            assert.strictEqual(bridge.quality, 95);
        });

        test('should validate all required parameters are provided', () => {
            // Missing quality
            assert.throws(() => {
                new XliffBridge({
                    requestPath: (lang, guid) => `${lang}/${guid}.xliff`,
                    completePath: (lang, guid) => `${lang}/${guid}_complete.xliff`
                });
            });

            // Missing completePath
            assert.throws(() => {
                new XliffBridge({
                    requestPath: (lang, guid) => `${lang}/${guid}.xliff`,
                    quality: 80
                });
            });

            // Missing requestPath
            assert.throws(() => {
                new XliffBridge({
                    completePath: (lang, guid) => `${lang}/${guid}_complete.xliff`,
                    quality: 80
                });
            });
        });
    });
});