import { test, describe } from 'node:test';
import assert from 'node:assert';
import serve from '../index.js';

describe('L10n Monster Server', () => {
    test('should export serve class', () => {
        assert.strictEqual(typeof serve, 'function');
        assert.ok(serve.help);
    });

    test('should have proper help configuration', () => {
        const help = serve.help;
        assert.ok(help.description);
        assert.ok(help.options);
        assert.ok(Array.isArray(help.options));
        
        const portOption = help.options.find(opt => opt[0].includes('--port'));
        assert.ok(portOption);
        
        const uiOption = help.options.find(opt => opt[0].includes('--ui'));
        assert.ok(uiOption);
    });

    test('should validate help structure', () => {
        const help = serve.help;
        
        assert.strictEqual(typeof help.description, 'string');
        assert.ok(help.description.includes('L10n Monster server'));
        
        help.options.forEach(option => {
            assert.ok(Array.isArray(option));
            assert.strictEqual(option.length, 2);
            assert.strictEqual(typeof option[0], 'string');
            assert.strictEqual(typeof option[1], 'string');
        });
    });

    test('should have static action method', () => {
        assert.strictEqual(typeof serve.action, 'function');
    });

    test('should handle basic server configuration', () => {
        // Test that the class can be instantiated and has expected structure
        assert.ok(serve.help);
        assert.ok(serve.action);
        
        // Validate action is async
        const actionString = serve.action.toString();
        assert.ok(actionString.includes('async') || actionString.includes('Promise'));
    });
});