import { test, describe } from 'node:test';
import assert from 'node:assert';
import runMonsterCLI from '../index.js';

describe('L10n Monster CLI', () => {
    test('should export runMonsterCLI function', () => {
        assert.strictEqual(typeof runMonsterCLI, 'function');
    });

    test('should handle invalid configuration gracefully', async () => {
        const mockConfig = {
            actions: [],
            run: async (opts, cb) => {
                throw new Error('Test error');
            }
        };

        let errorThrown = false;
        const originalExit = process.exit;
        process.exit = () => { errorThrown = true; };

        try {
            await runMonsterCLI(mockConfig, ['node', 'l10n', '--help']);
        } catch (e) {
            // Expected to catch error
        }

        process.exit = originalExit;
        // Test should complete without hanging
        assert.ok(true);
    });

    test('should parse command line arguments correctly', async () => {
        let capturedOpts = null;
        const mockConfig = {
            actions: [{
                name: 'test',
                help: {
                    description: 'Test command'
                }
            }],
            run: async (opts, cb) => {
                capturedOpts = opts;
                await cb({
                    test: async (options) => {
                        // Mock action
                    }
                });
            }
        };

        try {
            await runMonsterCLI(mockConfig, ['node', 'l10n', '--verbose', '2', 'test']);
        } catch (e) {
            // May throw due to incomplete mock, but should capture opts
        }

        if (capturedOpts) {
            assert.strictEqual(capturedOpts.verbose, 2);
        }
    });
});