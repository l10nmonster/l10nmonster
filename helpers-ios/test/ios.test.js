import { test, describe } from 'node:test';
import assert from 'node:assert';
import { StringsFilter, escapesDecoder, escapesEncoder, phDecoder } from '../index.js';

describe('iOS Helpers', () => {
    describe('StringsFilter', () => {
        test('should create instance with default options', () => {
            const filter = new StringsFilter();
            assert.strictEqual(filter.emitComments, false);
        });

        test('should create instance with custom options', () => {
            const filter = new StringsFilter({ emitComments: true });
            assert.strictEqual(filter.emitComments, true);
        });

        test('should parse simple strings resource', async () => {
            const filter = new StringsFilter();
            const resource = '"hello" = "Hello World";';
            
            const result = await filter.parseResource({ resource });
            
            assert.ok(result.segments);
            assert.strictEqual(result.segments.length, 1);
            assert.strictEqual(result.segments[0].sid, 'hello');
            assert.strictEqual(result.segments[0].str, 'Hello World');
        });
    });

    describe('escapesDecoder', () => {
        test('should be a function', () => {
            assert.strictEqual(typeof escapesDecoder, 'function');
        });

        test('should have correct name', () => {
            assert.strictEqual(escapesDecoder.name, 'iosEscapesDecoder');
        });
    });

    describe('escapesEncoder', () => {
        test('should encode control characters', () => {
            const result = escapesEncoder('Hello\nWorld\t!');
            assert.ok(result.includes('\\n'));
            assert.ok(result.includes('\\t'));
        });

        test('should handle carriage return and form feed', () => {
            const result = escapesEncoder('Test\r\fEnd');
            assert.ok(result.includes('\\r'));
            assert.ok(result.includes('\\f'));
        });
    });

    describe('phDecoder', () => {
        test('should be a function', () => {
            assert.strictEqual(typeof phDecoder, 'function');
        });

        test('should have correct name', () => {
            assert.strictEqual(phDecoder.name, 'iosPHDecoder');
        });
    });
});