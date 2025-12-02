import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

import * as android from '../index.js';
import { utils, normalizers, xml, requiredTargetPluralForms } from '@l10nmonster/core';

function getResource(resourceId) {
    return readFileSync(`tests/artifacts/${resourceId}`, "utf8");
}

suite("android filter tests", () => {
    const resourceFilter = new android.AndroidXMLFilter();
    const resourceId = "strings.xml";

    test("parseResource returns raw parsed resource", async () => {
        const expectedOutput = {
            segments: [
                {
                    sid: "app_short_name",
                    str: "",
                },
                {
                    sid: "str1",
                    str: "Winter is coming",
                },
                {
                    sid: "move_x_to",
                    str: "Move %1$s to…",
                },
                {
                    pluralForm: "one",
                    sid: "chapters_plural_one",
                    str: "%1$d chapter",
                },
                {
                    pluralForm: "other",
                    sid: "chapters_plural_other",
                    str: "%1$d chapters",
                },
            ],
        };
        const resource = getResource(resourceId);
        // Specify source/target plural forms to avoid expansion
        const output = await resourceFilter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });
        assert.deepEqual(output, expectedOutput);
    });

    const translator = async function translate(sid, str) {
        return sid === "str1" ?
            undefined :
            `${resourceId} ${sid} ${str} - **Translation**`;
    };
    test("translateResource returns string", async () => {
        const expectedOutput = getResource("strings_t9n.xml");
        const resource = getResource(resourceId);
        const translatedRes = await resourceFilter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });
        assert.deepEqual(translatedRes, expectedOutput);
    });

    test("android normalizers work as expected", async () => {
        const encodings = getResource("encodings.xml");
        const encodingsRes = await resourceFilter.parseResource({
            resource: encodings,
        });
        const standardDecoders = [
            xml.entityDecoder,
            xml.CDataDecoder,
            android.spaceCollapser,
            android.escapesDecoder,
            android.phDecoder,
            normalizers.doublePercentDecoder,
        ];
        assert.deepEqual(encodingsRes, {
            segments: [
                {
                    sid: "cdata",
                    str: `<![CDATA[gotta 'love' this!]]>`,
                },
                {
                    sid: "quotes",
                    str: `"it's magic"`,
                },
                {
                    sid: "chapter_x_of_y",
                    str: "Chapter %1$d of %2$d",
                },
                {
                    sid: "quotes",
                    str: `nothing to "see" here\\n`,
                },
                {
                    sid: "space",
                    str: `" space "`,
                },
                {
                    sid: "spaceTrimming",
                    str: "sp    ace",
                },
                {
                    sid: "new",
                    str: `What\\'s new\\n`,
                },
                {
                    sid: "html",
                    str: "&lt;b>bold&lt;/b>",
                },
                {
                    sid: "escapedSingleQuoteInCdata",
                    str: `<![CDATA[Winter is <strong><color name=\\'orange\\'>coming</color></strong>]]>`,
                },
                {
                    sid: "escapedDoubleQuoteInCdata",
                    str: `<![CDATA[Winter is <strong><color name=\\"orange\\">coming</color></strong>]]>`,
                },
                {
                    sid: "percent",
                    str: "one % two %% escaped \\u0025",
                },
            ],
        });
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[0].str, [
                xml.CDataDecoder,
            ])[0],
            `gotta 'love' this!`
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[1].str, [
                xml.CDataDecoder,
            ])[0],
            `it's magic`
        );
        const nsrc2 = [
            "Chapter ",
            { t: "x", v: "%1$d" },
            " of ",
            { t: "x", v: "%2$d" },
        ];
        assert.deepEqual(
            utils.getNormalizedString(encodingsRes.segments[2].str, [
                android.phDecoder,
            ]),
            nsrc2
        );
        const econdedNsrc2 = nsrc2.map((p) => (typeof p === "string" ? android.escapesEncoder(p) : p));
        assert.deepEqual(econdedNsrc2, [
            "Chapter ",
            { t: "x", v: "%1$d" },
            " of ",
            { t: "x", v: "%2$d" },
        ]);
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[3].str, [
                android.escapesDecoder,
            ])[0],
            `nothing to "see" here\n`
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[4].str, [
                xml.CDataDecoder,
            ])[0],
            " space "
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[5].str, [
                android.spaceCollapser,
            ])[0],
            "sp ace"
        );
        assert.equal(
            utils.getNormalizedString(
                encodingsRes.segments[6].str,
                standardDecoders
            )[0],
            `What's new\n`
        );
        const nsrc7 = [{ t: "bx", v: "<b>" }, "bold", { t: "ex", v: "</b>" }];
        assert.deepEqual(
            utils.getNormalizedString(encodingsRes.segments[7].str, [
                ...standardDecoders,
                xml.tagDecoder,
            ]),
            nsrc7
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[8].str, [
                xml.CDataDecoder,
            ])[0],
            `Winter is <strong><color name=\\'orange\\'>coming</color></strong>`
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[9].str, [
                xml.CDataDecoder,
            ])[0],
            `Winter is <strong><color name=\\"orange\\">coming</color></strong>`
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[10].str, [
                android.escapesDecoder,
            ])[0],
            "one % two %% escaped %"
        );
        assert.equal(
            utils.getNormalizedString(encodingsRes.segments[10].str, [
                normalizers.doublePercentDecoder,
            ])[0],
            "one % two % escaped \\u0025"
        );
        assert.equal(
            utils.getNormalizedString(
                encodingsRes.segments[10].str,
                standardDecoders
            )[0],
            "one % two % escaped %"
        );
    });
});

suite("android filter plurals tests", () => {
    const resourceFilter = new android.AndroidXMLFilter();
    const resourceId = "plurals.xml";
    const translator = async function translate(sid, str) {
        return sid === "str1" ?
            undefined :
            `${resourceId} ${sid} ${str} - **Translation**`;
    };

    test("android filter parses plurals with comments", async () => {
        const resource = getResource(resourceId);
        const output = await resourceFilter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });
        const expected = {
            segments: [
                {
                    pluralForm: "one",
                    notes: "PH(%1$d|1|The number of rooms desired for a hotel search) PH(%2$s|2 Adults|A suffix, in this case the number of adult and children passengers)",
                    sid: "rooms_count_with_suffix_one",
                    str: "%1$d room • %2$s",
                },
                {
                    pluralForm: "other",
                    notes: "PH(%1$d|1|The number of rooms desired for a hotel search) PH(%2$s|2 Adults|A suffix, in this case the number of adult and children passengers)",
                    sid: "rooms_count_with_suffix_other",
                    str: "%1$d rooms • %2$s",
                },
            ],
        };
        assert.deepEqual(output, expected);
    });

    test("android filter translates plurals with comments", async () => {
        const expectedOutput = getResource("plurals_t9n.xml");
        const resource = getResource(resourceId);
        const translatedRes = await resourceFilter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });
        assert.equal(translatedRes, expectedOutput);
    });
});

suite("android filter plural expansion/contraction tests", () => {
    const resourceFilter = new android.AndroidXMLFilter();

    test("parseResource generates missing plural forms for target language", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="items">
        <item quantity="one">%1$d item</item>
        <item quantity="other">%1$d items</item>
    </plurals>
</resources>`;

        const output = await resourceFilter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'many', 'other'],
        });

        // Should have original 2 + generated 2 (few, many) = 4
        assert.equal(output.segments.length, 4);

        const forms = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(forms, ['few', 'many', 'one', 'other']);

        // Generated forms should use 'other' value
        const fewForm = output.segments.find(s => s.pluralForm === 'few');
        assert.equal(fewForm.str, '%1$d items');
        assert.equal(fewForm.sid, 'items_few');
    });

    test("parseResource generates all 6 forms when requiredTargetPluralForms() returns all forms", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="days">
        <item quantity="one">%d day</item>
        <item quantity="other">%d days</item>
    </plurals>
</resources>`;

        const output = await resourceFilter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            // requiredTargetPluralForms() with no args returns all 6 forms
            targetPluralForms: requiredTargetPluralForms(),
        });

        assert.equal(output.segments.length, 6);
        const forms = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(forms, ['few', 'many', 'one', 'other', 'two', 'zero']);
    });

    test("parseResource handles source missing 'other' form (no expansion)", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="incomplete">
        <item quantity="one">only one</item>
    </plurals>
</resources>`;

        const output = await resourceFilter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        // Should have 1 segment with pluralForm (Android <plurals> is explicitly plural)
        // But no expansion since 'other' is missing
        assert.equal(output.segments.length, 1);
        assert.equal(output.segments[0].pluralForm, 'one');
        assert.equal(output.segments[0].sid, 'incomplete_one');
    });

    test("parseResource expands even with missing source forms (if 'other' exists)", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="items">
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;

        const output = await resourceFilter.parseResource({
            resource,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        // Should have 1 original + 2 generated (one, few) = 3
        assert.equal(output.segments.length, 3);
        const forms = output.segments.map(s => s.pluralForm).sort();
        assert.deepEqual(forms, ['few', 'one', 'other']);
    });

    test("translateResource generates only required target forms", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="items">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;

        const translator = async (sid, str) => `[${sid}] ${str}`;

        const output = await resourceFilter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        // Should contain only the 3 required forms
        assert.ok(output.includes('quantity="one"'));
        assert.ok(output.includes('quantity="few"'));
        assert.ok(output.includes('quantity="other"'));
        // Should NOT contain forms not in targetPluralForms
        assert.ok(!output.includes('quantity="zero"'));
        assert.ok(!output.includes('quantity="two"'));
        assert.ok(!output.includes('quantity="many"'));

        // 'few' should use 'other' value since it's not in source
        assert.ok(output.includes('[items_few] %d items'));
    });

    test("translateResource contracts plurals for languages with fewer forms", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="items">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;

        const translator = async (sid, str) => `翻訳: ${str}`;

        // Japanese only needs 'other' form
        const output = await resourceFilter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['other'],
        });

        // Should contain only 'other' form
        assert.ok(output.includes('quantity="other"'));
        assert.ok(!output.includes('quantity="one"'));
    });

    test("translateResource handles source missing 'other' form", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="title">Hello</string>
    <plurals name="incomplete">
        <item quantity="one">one only</item>
    </plurals>
</resources>`;

        const translator = async (sid, str) => `[${str}]`;

        const output = await resourceFilter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'other'],
        });

        // String should be translated
        assert.ok(output.includes('[Hello]'));
        // Plural with only 'one' form but no 'other' cannot be expanded
        // Since there's no fallback value to use for 'other', the plural is dropped
        assert.ok(!output.includes('incomplete'));
    });

    test("translateResource expands source with only 'other' form", async () => {
        const resource = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <plurals name="items">
        <item quantity="other">%d items</item>
    </plurals>
</resources>`;

        const translator = async (sid, str) => `[${sid}] ${str}`;

        const output = await resourceFilter.translateResource({
            resource,
            translator,
            sourcePluralForms: ['one', 'other'],
            targetPluralForms: ['one', 'few', 'other'],
        });

        // Should expand 'other' to all required forms
        assert.ok(output.includes('quantity="one"'));
        assert.ok(output.includes('quantity="few"'));
        assert.ok(output.includes('quantity="other"'));
        // All should use the 'other' source value
        assert.ok(output.includes('[items_one] %d items'));
        assert.ok(output.includes('[items_few] %d items'));
        assert.ok(output.includes('[items_other] %d items'));
    });
});
