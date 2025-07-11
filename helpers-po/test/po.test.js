import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PoFilter } from '../index.js';

describe('PO Filter', () => {
    test('should create instance', () => {
        const filter = new PoFilter();
        assert.ok(filter instanceof PoFilter);
    });

    test('should parse basic PO resource', async () => {
        const filter = new PoFilter();
        const resource = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "hello"
msgstr "Hello World"

msgid "goodbye"
msgstr "Goodbye World"
`;

        const result = await filter.parseResource({ resource, isSource: false });
        
        assert.ok(result.segments);
        assert.strictEqual(result.segments.length, 2);
        
        const helloSegment = result.segments.find(s => s.str === 'Hello World');
        assert.ok(helloSegment);
        assert.ok(helloSegment.sid.includes(':'));
        
        const goodbyeSegment = result.segments.find(s => s.str === 'Goodbye World');
        assert.ok(goodbyeSegment);
        assert.ok(goodbyeSegment.sid.includes(':'));
    });

    test('should handle source parsing', async () => {
        const filter = new PoFilter();
        const resource = `
msgid ""
msgstr ""

msgid "hello"
msgstr ""
`;

        const result = await filter.parseResource({ resource, isSource: true });
        
        assert.ok(result.segments);
        assert.strictEqual(result.segments.length, 1);
        assert.strictEqual(result.segments[0].str, 'hello');
    });

    test('should handle comments and flags', async () => {
        const filter = new PoFilter();
        const resource = `
msgid ""
msgstr ""

#. Translator comment
#: source/file.c:123
#, fuzzy
msgid "test"
msgstr "Test Message"
`;

        const result = await filter.parseResource({ resource, isSource: false });
        
        assert.ok(result.segments);
        assert.strictEqual(result.segments.length, 1);
        
        const segment = result.segments[0];
        assert.strictEqual(segment.str, 'Test Message');
        assert.ok(segment.notes);
        assert.ok(JSON.parse(segment.notes));
    });

    test('should generate SHA1-based segment IDs', async () => {
        const filter = new PoFilter();
        const resource = `
msgid ""
msgstr ""

msgid "test message"
msgstr "Translated message"
`;

        const result = await filter.parseResource({ resource, isSource: false });
        
        assert.ok(result.segments);
        assert.strictEqual(result.segments.length, 1);
        
        const segment = result.segments[0];
        assert.ok(segment.sid.startsWith(':'));
        assert.ok(segment.sid.length > 10); // Should contain base64 encoded hash
    });
});