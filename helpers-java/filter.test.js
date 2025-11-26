import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { PropertiesFilter } from './index.js';

suite("JavaPropertiesFilter parseResource - pluralization disabled (default)", () => {
    const filter = new PropertiesFilter();

    test("parseResource returns segments without plural detection", async () => {
        const resource = `greeting=Hello
item_one=One item
item_other=Many items
farewell=Goodbye`;

        const output = await filter.parseResource({ resource });

        assert.equal(output.segments.length, 4);
        assert.deepEqual(output.segments.map(s => s.sid), ['greeting', 'item_one', 'item_other', 'farewell']);
        // No pluralForm should be set
        for (const seg of output.segments) {
            assert.equal(seg.pluralForm, undefined);
        }
    });

    test("parseResource handles comments", async () => {
        const resource = `# This is a greeting
greeting=Hello
# Item count
item_one=One item`;

        const output = await filter.parseResource({ resource });

        assert.equal(output.segments.length, 2);
        assert.equal(output.segments[0].notes, '# This is a greeting');
        assert.equal(output.segments[1].notes, '# Item count');
    });

    test("parseResource skips DO_NOT_TRANSLATE", async () => {
        const resource = `# DO_NOT_TRANSLATE
secret=keep_this
greeting=Hello`;

        const output = await filter.parseResource({ resource });

        assert.equal(output.segments.length, 1);
        assert.equal(output.segments[0].sid, 'greeting');
    });
});

suite("JavaPropertiesFilter parseResource - pluralization enabled", () => {
    const filter = new PropertiesFilter({ enablePluralizationSuffixes: true });

    test("parseResource detects and marks plural forms", async () => {
        const resource = `greeting=Hello
item_one=One item
item_other=Many items
farewell=Goodbye`;

        const output = await filter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        // greeting, item_one, item_other, farewell = 4 segments
        assert.equal(output.segments.length, 4);

        const itemOne = output.segments.find(s => s.sid === 'item_one');
        const itemOther = output.segments.find(s => s.sid === 'item_other');
        const greeting = output.segments.find(s => s.sid === 'greeting');

        assert.equal(itemOne.pluralForm, 'one');
        assert.equal(itemOther.pluralForm, 'other');
        assert.equal(greeting.pluralForm, undefined);
    });

    test("parseResource generates missing plural forms for target", async () => {
        const resource = `item_one=One item
item_other=Many items`;

        const output = await filter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'two', 'few', 'many', 'other'],
        });

        // Original 2 + generated 3 (two, few, many) = 5
        assert.equal(output.segments.length, 5);

        const suffixes = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(suffixes, ['few', 'many', 'one', 'other', 'two']);

        // Generated forms should have the _other value
        const itemTwo = output.segments.find(s => s.sid === 'item_two');
        assert.equal(itemTwo.str, 'Many items');
        assert.equal(itemTwo.pluralForm, 'two');
    });

    test("parseResource does not mark incomplete plural groups", async () => {
        const resource = `item_one=One item
other_key=Something else`;

        const output = await filter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        // item_one is missing item_other, so it shouldn't be marked as plural
        assert.equal(output.segments.length, 2);
        for (const seg of output.segments) {
            assert.equal(seg.pluralForm, undefined);
        }
    });

    test("parseResource requires all source forms to be present", async () => {
        const resource = `item_one=One item
item_other=Many items`;

        // Arabic requires all 6 forms
        const output = await filter.parseResource({
            resource,
            sourcePluralForms: ['zero', 'one', 'two', 'few', 'many', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        // Only 2 forms present, but 6 required - should NOT be marked as plural
        assert.equal(output.segments.length, 2);
        for (const seg of output.segments) {
            assert.equal(seg.pluralForm, undefined);
        }
    });
});

suite("JavaPropertiesFilter translateResource - pluralization disabled (default)", () => {
    const filter = new PropertiesFilter();

    test("translateResource translates all entries directly", async () => {
        const resource = `greeting=Hello
item_one=One item
item_other=Many items`;

        const translator = async (key, value) => `[${key}] ${value}`;

        const output = await filter.translateResource({ resource, translator });

        assert.ok(output.includes('[greeting] Hello'));
        assert.ok(output.includes('[item_one] One item'));
        assert.ok(output.includes('[item_other] Many items'));
    });

    test("translateResource skips entries when translator returns undefined", async () => {
        const resource = `greeting=Hello
secret=DoNotTranslate`;

        const translator = async (key, value) => {
            if (key === 'secret') return undefined;
            return `[${key}] ${value}`;
        };

        const output = await filter.translateResource({ resource, translator });

        assert.ok(output.includes('[greeting] Hello'));
        assert.ok(!output.includes('secret'));
    });
});

suite("JavaPropertiesFilter translateResource - pluralization enabled", () => {
    const filter = new PropertiesFilter({ enablePluralizationSuffixes: true });

    test("translateResource generates target plural forms", async () => {
        const resource = `greeting=Hello
item_one=One item
item_other=Many items`;

        const translator = async (key, value) => `[${key}] ${value}`;

        const output = await filter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'many', 'other'],
        });

        // Should have greeting + 4 plural forms (one, few, many, other)
        assert.ok(output.includes('[greeting] Hello'));
        assert.ok(output.includes('[item_one]'));
        assert.ok(output.includes('[item_few]'));
        assert.ok(output.includes('[item_many]'));
        assert.ok(output.includes('[item_other]'));
    });

    test("translateResource uses _other value for missing source forms", async () => {
        const resource = `item_one=One item
item_other=Many items`;

        const translations = {};
        const translator = async (key, value) => {
            translations[key] = value;
            return `translated:${value}`;
        };

        await filter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        // item_few should use item_other's value
        assert.equal(translations['item_one'], 'One item');
        assert.equal(translations['item_few'], 'Many items');
        assert.equal(translations['item_other'], 'Many items');
    });

    test("translateResource does not process incomplete plural groups", async () => {
        const resource = `item_one=One item
other_key=Something`;

        const translator = async (key, value) => `[${key}] ${value}`;

        const output = await filter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        // item_one is incomplete (missing item_other), so treat as regular
        assert.ok(output.includes('[item_one] One item'));
        assert.ok(output.includes('[other_key] Something'));
        // Should NOT generate item_few since item is not a valid plural group
        assert.ok(!output.includes('item_few'));
    });

    test("translateResource skips plural group when translator returns undefined", async () => {
        const resource = `item_one=One item
item_other=Many items
greeting=Hello`;

        const translator = async (key, value) => {
            if (key.startsWith('item_')) return undefined;
            return `[${key}] ${value}`;
        };

        const output = await filter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        assert.ok(output.includes('[greeting] Hello'));
        assert.ok(!output.includes('item_'));
    });
});
