import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { StringsdictFilter } from '../stringsdict.js';
import { requiredTargetPluralForms } from '@l10nmonster/core';

const sampleStringsdict = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>item_count</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>One item</string>
            <key>other</key>
            <string>%d items</string>
        </dict>
    </dict>
</dict>
</plist>`;

suite('stringsdict filter tests', () => {
    const filter = new StringsdictFilter();

    test('parseResource extracts plural segments', async () => {
        const output = await filter.parseResource({
            resource: sampleStringsdict,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        assert.equal(output.segments.length, 2);

        const oneForm = output.segments.find(s => s.pluralForm === 'one');
        assert.equal(oneForm.sid, 'item_count/items_one');
        assert.equal(oneForm.str, 'One item');

        const otherForm = output.segments.find(s => s.pluralForm === 'other');
        assert.equal(otherForm.sid, 'item_count/items_other');
        assert.equal(otherForm.str, '%d items');
    });

    test('parseResource expands missing plural forms from other', async () => {
        const output = await filter.parseResource({
            resource: sampleStringsdict,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['zero', 'one', 'few', 'many', 'other'],
        });

        // Should have 2 original + 3 generated (zero, few, many)
        assert.equal(output.segments.length, 5);

        const forms = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(forms, ['few', 'many', 'one', 'other', 'zero']);

        // Generated forms should use 'other' value
        const fewForm = output.segments.find(s => s.pluralForm === 'few');
        assert.equal(fewForm.str, '%d items');
    });

    test('parseResource generates all 6 forms when requiredTargetPluralForms() returns all forms', async () => {
        const output = await filter.parseResource({
            resource: sampleStringsdict,
            // requiredTargetPluralForms() with no args returns all 6 forms
            targetPluralForms: requiredTargetPluralForms(),
        });

        assert.equal(output.segments.length, 6);
        const forms = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(forms, ['few', 'many', 'one', 'other', 'two', 'zero']);
    });

    test('parseResource handles source with only other form', async () => {
        const otherOnlyStringsdict = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@count@</string>
        <key>count</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>other</key>
            <string>%d things</string>
        </dict>
    </dict>
</dict>
</plist>`;

        const output = await filter.parseResource({
            resource: otherOnlyStringsdict,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        // Should have 1 original + 2 generated (one, few)
        assert.equal(output.segments.length, 3);
        const forms = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(forms, ['few', 'one', 'other']);
    });

    test('parseResource handles source missing other form (no expansion)', async () => {
        const noOtherStringsdict = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@count@</string>
        <key>count</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>One thing</string>
        </dict>
    </dict>
</dict>
</plist>`;

        const output = await filter.parseResource({
            resource: noOtherStringsdict,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        // Should have only the 'one' form since there's no 'other' to expand from
        assert.equal(output.segments.length, 1);
        assert.equal(output.segments[0].pluralForm, 'one');
    });
});

suite('stringsdict filter translateResource tests', () => {
    const filter = new StringsdictFilter();

    test('translateResource translates plural forms', async () => {
        const translator = async (sid, str) => `[${sid}] ${str}`;

        const output = await filter.translateResource({
            resource: sampleStringsdict,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        assert.ok(output);
        assert.ok(output.includes('[item_count/items_one] One item'));
        assert.ok(output.includes('[item_count/items_other] %d items'));
    });

    test('translateResource expands to target forms', async () => {
        const translator = async (sid, str) => `[${sid}] ${str}`;

        const output = await filter.translateResource({
            resource: sampleStringsdict,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        assert.ok(output);
        assert.ok(output.includes('[item_count/items_one] One item'));
        assert.ok(output.includes('[item_count/items_few] %d items')); // uses other
        assert.ok(output.includes('[item_count/items_other] %d items'));
    });

    test('translateResource contracts to fewer forms', async () => {
        const translator = async (sid, str) => `翻訳: ${str}`;

        // Japanese only needs 'other' form
        const output = await filter.translateResource({
            resource: sampleStringsdict,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['other'],
        });

        assert.ok(output);
        assert.ok(output.includes('翻訳: %d items'));
        assert.ok(!output.includes('One item'));
    });

    test('translateResource returns null when no translations', async () => {
        const translator = async () => undefined;

        const output = await filter.translateResource({
            resource: sampleStringsdict,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        assert.equal(output, null);
    });

    test('translateResource handles source missing other form', async () => {
        const noOtherStringsdict = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@count@</string>
        <key>count</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>One thing</string>
        </dict>
    </dict>
</dict>
</plist>`;

        const translator = async (sid, str) => `[${str}]`;

        // Needs 'other' form but source doesn't have it - should be dropped
        const output = await filter.translateResource({
            resource: noOtherStringsdict,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        assert.equal(output, null);
    });

    test('translateResource expands source with only other form', async () => {
        const otherOnlyStringsdict = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@count@</string>
        <key>count</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>other</key>
            <string>%d things</string>
        </dict>
    </dict>
</dict>
</plist>`;

        const translator = async (sid, str) => `[${sid}] ${str}`;

        const output = await filter.translateResource({
            resource: otherOnlyStringsdict,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        assert.ok(output);
        assert.ok(output.includes('[items/count_one] %d things'));
        assert.ok(output.includes('[items/count_few] %d things'));
        assert.ok(output.includes('[items/count_other] %d things'));
    });
});
