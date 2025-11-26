import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { i18next } from './index.js';
import { flattenAndSplitResources } from './utils.js';

suite("json parseResource - description", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
    });

    test("parseResource returns raw parsed resource for simple string no description", async () => {
        const resource = {
            "@@targetLocales": ["en", "de"],
            homeSubtitle: "Book the trip you've been waiting for.",
            "home@Subtitle": "@ Book the trip you've been waiting for.",
        };
        const expectedOutput = {
            targetLangs: ["en", "de"],
            segments: [
                {
                    sid: "homeSubtitle",
                    str: "Book the trip you've been waiting for.",
                },
                {
                    sid: "home@Subtitle",
                    str: "@ Book the trip you've been waiting for.",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

    test("parseResource returns raw parsed resource for simple string", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            "home@Subtitle": "Book the trip you've been waiting for.",
            "@home@Subtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            "@homeSubtitle1": {
                description:
                    "header - This is the welcome message subtitle on the home page 1",
            },
            homeSubtitle1: "Book the trip you've been waiting for. 1",
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "homeSubtitle",
                    str: "Book the trip you've been waiting for.",
                    notes: "header - This is the welcome message subtitle on the home page",
                },
                {
                    sid: "home@Subtitle",
                    str: "Book the trip you've been waiting for.",
                    notes: "header - This is the welcome message subtitle on the home page",
                },
                {
                    sid: "homeSubtitle1",
                    str: "Book the trip you've been waiting for. 1",
                    notes: "header - This is the welcome message subtitle on the home page 1",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

    test("parseResource returns raw parsed resource for nested strings", async () => {
        const resource = {
            flightHome: {
                title: "<strong>Welcome back</strong> to travel.",
                "@title": {
                    description: "header - welcome message of flight flow",
                },

                "@subtitle": {
                    description: "subtitle - flight landing page subheading",
                },
                subtitle: "Book the trip you've been waiting for.",
            },
        };
        const expectedOutput = {
            segments: [
                {
                    notes: "header - welcome message of flight flow",
                    sid: "flightHome.title",
                    str: "<strong>Welcome back</strong> to travel.",
                },
                {
                    notes: "subtitle - flight landing page subheading",
                    sid: "flightHome.subtitle",
                    str: "Book the trip you've been waiting for.",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

    test("parseResource returns raw parsed resource for multiple arb attributes", async () => {
        const resource = {
            flightHome: {
                title: "<strong>Welcome back</strong> to travel.",
                "@title": {
                    description: "header - welcome message of flight flow",
                    context: "context attribute",
                    type: "type attribute",
                },

                "@subtitle": {
                    description: "subtitle - flight landing page subheading",
                },
                subtitle: "Book the trip you've been waiting for.",
            },
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "flightHome.title",
                    str: "<strong>Welcome back</strong> to travel.",
                    notes: "header - welcome message of flight flow\ncontext: context attribute\ntype: type attribute",
                },
                {
                    sid: "flightHome.subtitle",
                    str: "Book the trip you've been waiting for.",
                    notes: "subtitle - flight landing page subheading",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });
});
suite("json parseResource - no options", () => {
    const resourceFilter = new i18next.I18nextFilter();
    test("parseResource returns raw parsed resource for simple string", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "homeSubtitle",
                    str: "Book the trip you've been waiting for.",
                },
                {
                    sid: "@homeSubtitle.description",
                    str: "header - This is the welcome message subtitle on the home page",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

    test("parseResource returns raw parsed resource for simple string description after property", async () => {
        const resource = {
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            homeSubtitle: "Book the trip you've been waiting for.",
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "@homeSubtitle.description",
                    str: "header - This is the welcome message subtitle on the home page",
                },
                {
                    sid: "homeSubtitle",
                    str: "Book the trip you've been waiting for.",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

    test("parseResource returns raw parsed resource for nested strings", async () => {
        const resource = {
            flightHome: {
                title: "<strong>Welcome back</strong> to travel.",
                "@title": {
                    description: "header - welcome message of flight flow",
                },

                "@subtitle": {
                    description: "subtitle - flight landing page subheading",
                },
                subtitle: "Book the trip you've been waiting for.",
            },
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "flightHome.title",
                    str: "<strong>Welcome back</strong> to travel.",
                },
                {
                    sid: "flightHome.@title.description",
                    str: "header - welcome message of flight flow",
                },
                {
                    sid: "flightHome.@subtitle.description",
                    str: "subtitle - flight landing page subheading",
                },
                {
                    sid: "flightHome.subtitle",
                    str: "Book the trip you've been waiting for.",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });
});

suite("json parseResource -  plurals", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
    });
    test("parseResource returns raw parsed resource for plural", async () => {
        const resource = {
            timeCount: {
                day_one: "{{count}} day",
                "@day_one": {
                    description: "copy - time copy for day singular",
                },

                day_other: "{{count}} days",
                "@day_other": {
                    description: "copy - time copy for days plural",
                },
                day_zero: "{{count}} days",
                "@day_zero": {
                    description: "copy - time copy for days plural",
                },
                day_two: "{{count}} days",
                "@day_two": {
                    description: "copy - time copy for days plural",
                },
                day_few: "{{count}} days",
                "@day_few": {
                    description: "copy - time copy for days plural",
                },
                day_many: "{{count}} days",
                "@day_many": {
                    description: "copy - time copy for days plural",
                },
                second_one: "{{count}} second",
                "@second_one": {
                    description: "copy - time copy for second singular",
                },

                second_other: "{{count}} seconds",
                "@second_other": {
                    description: "copy - time copy for seconds plural",
                },
            },
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "timeCount.day_one",
                    str: "{{count}} day",
                    pluralForm: "one",
                    notes: "copy - time copy for day singular",
                },
                {
                    sid: "timeCount.day_other",
                    str: "{{count}} days",
                    pluralForm: "other",
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_zero",
                    str: "{{count}} days",
                    pluralForm: "zero",
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_two",
                    str: "{{count}} days",
                    pluralForm: "two",
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_few",
                    str: "{{count}} days",
                    pluralForm: "few",
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_many",
                    str: "{{count}} days",
                    pluralForm: "many",
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.second_one",
                    str: "{{count}} second",
                    pluralForm: "one",
                    notes: "copy - time copy for second singular",
                },
                {
                    sid: "timeCount.second_other",
                    str: "{{count}} seconds",
                    pluralForm: "other",
                    notes: "copy - time copy for seconds plural",
                },
                {
                    sid: "timeCount.second_zero",
                    str: "{{count}} seconds",
                    pluralForm: "zero",
                    notes: "copy - time copy for seconds plural",
                },
                {
                    sid: "timeCount.second_two",
                    str: "{{count}} seconds",
                    pluralForm: "two",
                    notes: "copy - time copy for seconds plural",
                },
                {
                    sid: "timeCount.second_few",
                    str: "{{count}} seconds",
                    pluralForm: "few",
                    notes: "copy - time copy for seconds plural",
                },
                {
                    sid: "timeCount.second_many",
                    str: "{{count}} seconds",
                        pluralForm: "many",
                    notes: "copy - time copy for seconds plural",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

    test("parseResource adds missing plural forms from _other", async () => {
        const resource = {
            key_one: "{{count}} item",
            "@key_one": {
                description: "singular form",
            },
            key_other: "{{count}} items",
            "@key_other": {
                description: "plural form",
            },
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });

        // Should have original forms plus missing forms (zero, two, few, many)
        assert.equal(output.segments.length, 6);

        // Check that all forms are present
        const sids = output.segments.map(s => s.sid);
        assert.ok(sids.includes("key_one"));
        assert.ok(sids.includes("key_other"));
        assert.ok(sids.includes("key_zero"));
        assert.ok(sids.includes("key_two"));
        assert.ok(sids.includes("key_few"));
        assert.ok(sids.includes("key_many"));

        // Check that missing forms use _other value and notes
        const zeroForm = output.segments.find(s => s.sid === "key_zero");
        assert.equal(zeroForm.str, "{{count}} items");
        assert.equal(zeroForm.notes, "plural form");
        assert.equal(zeroForm.pluralForm, "zero");

        const twoForm = output.segments.find(s => s.sid === "key_two");
        assert.equal(twoForm.str, "{{count}} items");
        assert.equal(twoForm.notes, "plural form");
        assert.equal(twoForm.pluralForm, "two");
    });

    test("incomplete plural sets are NOT marked as pluralized", async () => {
        // For English, both _one and _other are required
        const resource = {
            // Only has _one, missing _other - should NOT be pluralized
            incomplete_one: "{{count}} thing",
            // Only has _other, missing _one - should NOT be pluralized
            partial_other: "{{count}} widgets",
            // Regular string that happens to end with _one - should NOT be pluralized
            button_one: "Click me",
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });

        // Should have exactly 3 segments (no generated forms)
        assert.equal(output.segments.length, 3);

        // None should have pluralForm
        for (const seg of output.segments) {
            assert.equal(seg.pluralForm, undefined, `${seg.sid} should not have pluralForm`);
        }
    });

    test("Arabic source requires all 6 forms to be considered pluralized", async () => {
        const arabicFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
        });
        const arabicPluralForms = ['zero', 'one', 'two', 'few', 'many', 'other'];

        // Only provide 2 forms - not enough for Arabic
        const incompleteResource = {
            item_one: "عنصر واحد",
            item_other: "عناصر",
        };
        const incompleteOutput = await arabicFilter.parseResource({
            resource: JSON.stringify(incompleteResource),
            sourcePluralForms: arabicPluralForms,
            targetPluralForms: arabicPluralForms,
        });

        // Should NOT be pluralized (Arabic requires zero, one, two, few, many, other)
        assert.equal(incompleteOutput.segments.length, 2);
        for (const seg of incompleteOutput.segments) {
            assert.equal(seg.pluralForm, undefined);
        }

        // Provide all 6 forms - should be pluralized
        const completeResource = {
            item_zero: "لا عناصر",
            item_one: "عنصر واحد",
            item_two: "عنصران",
            item_few: "عناصر قليلة",
            item_many: "عناصر كثيرة",
            item_other: "عناصر",
        };
        const completeOutput = await arabicFilter.parseResource({
            resource: JSON.stringify(completeResource),
            sourcePluralForms: arabicPluralForms,
            targetPluralForms: arabicPluralForms,
        });

        // All 6 should be pluralized (no missing forms to generate)
        assert.equal(completeOutput.segments.length, 6);
        for (const seg of completeOutput.segments) {
            assert.ok(seg.pluralForm, `${seg.sid} should have pluralForm`);
        }
    });
});


suite("flattenAndSplitResources tests", () => {
    test("flattenAndSplitResources happy case", () => {
        const obj = {
            str: "string",
            "@str": {
                description: "string",
            },
            ns1: {
                str: "string, {{foo}}",
                "@str": {
                    description: "string",
                    placeholders: { foo: { example: "foo example", description: "foo description" } }
                },
                ns2: {
                    str: "string",
                    "@str": {
                        description: "string",
                    },
                }
            }
        }
        const {res, notes} = flattenAndSplitResources([], obj)
        assert.deepEqual(res, {
            str: 'string',
            'ns1.str': 'string, {{foo}}',
            'ns1.ns2.str': 'string'
        })
        assert.deepEqual(notes, {
            str: {
                description: 'string'
            },
            'ns1.str': {
                description: 'string',
                placeholders: {
                    foo: {
                        example: "foo example",
                        description: "foo description"
                    }
                }
            },
            'ns1.ns2.str': {
                description: 'string'
            }
        })
    })
})

suite("placeholders tests", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
    });

    test("placeholders are in the notes after parsing", async () => {
        const resource = {
            nationalIdPlaceholder: "Enter your {{id}}",
            "@nationalIdPlaceholder": {
                description: "copy - national ID input placeholder on passenger form",
                placeholders: {
                    id: {
                        example: "CPF",
                        description: "Name of a national ID"
                    }
                }
            }
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "nationalIdPlaceholder",
                    str: "Enter your {{id}}",
                    notes: `copy - national ID input placeholder on passenger form\nPH({{id}}|CPF|Name of a national ID)`
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);

    })
})

suite("Parse illegally structured ARB", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
    });
    test("parses root ARB key that is illegally structured", async () => {
        // value for the "@key" should be an object,
        // but it should not crash even if it doesn't either
        const resource = {
            key: "value",
            "@key": "comment",
            ns: {
                key: "value",
                "@key": "comment",
                child: {
                    key: "value",
                    "@key": "comment",
                }
            }
        }
        const expectedOutput = {
            segments: [
                { sid: "key", str: "value" },
                { sid: "@key", str: "comment" },
                { sid: "ns.key", str: "value" },
                { sid: "ns.@key", str: "comment" },
                { sid: "ns.child.key", str: "value" },
                { sid: "ns.child.@key", str: "comment" },
            ]
        }
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    })
})

suite("nested placeholder tests", () => {
    test("parseResource handles deeply nested placeholders", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
        });
        const resource = {
            recentSearch: {
                cars: {
                    differentPlaceDropOff: "Drop off at {{pickupLocationName}} instead of pickup location",
                    "@differentPlaceDropOff": {
                        description: "Message when drop-off differs from pickup for car rentals",
                        placeholders: {
                            pickupLocationName: {
                                example: "Downtown San Francisco",
                                description: "The name of the pickup location for car rental"
                            }
                        }
                    }
                }
            }
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "recentSearch.cars.differentPlaceDropOff",
                    str: "Drop off at {{pickupLocationName}} instead of pickup location",
                    notes: `Message when drop-off differs from pickup for car rentals\nPH({{pickupLocationName}}|Downtown San Francisco|The name of the pickup location for car rental)`
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });

})

suite("annotation handler tests", () => {
    test("description handler works", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            arbAnnotationHandlers: {
                description: () => "forced description",
            }
        });
        const resource = {
            hello: "Hello",
            "@hello": {
                description: "",
            }
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "hello",
                    str: "Hello",
                    notes: "forced description"
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    })

    test("placeholders handler works", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
        });
        const resource = {
            nationalIdPlaceholder: "Enter your {{id}}",
            "@nationalIdPlaceholder": {
                description: "copy - national ID input placeholder on passenger form",
                placeholders: {
                    id: {
                        example: "CPF",
                        description: "Name of a national ID"
                    }
                }
            }
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "nationalIdPlaceholder",
                    str: "Enter your {{id}}",
                    notes: `copy - national ID input placeholder on passenger form\nPH({{id}}|CPF|Name of a national ID)`
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    })
})

suite("generateResource tests", () => {
    const identityTranslator = async (seg) => ({ str: seg.str });

    test("generates simple resource", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "hello", str: "Hello World" },
            { sid: "goodbye", str: "Goodbye World" }
        ];
        const output = await resourceFilter.generateResource({ segments, translator: identityTranslator });
        const parsed = JSON.parse(output);
        assert.deepEqual(parsed, {
            hello: "Hello World",
            goodbye: "Goodbye World"
        });
    });

    test("generates nested resource", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "greeting.hello", str: "Hello" },
            { sid: "greeting.goodbye", str: "Goodbye" },
            { sid: "title", str: "My App" }
        ];
        const output = await resourceFilter.generateResource({ segments, translator: identityTranslator });
        const parsed = JSON.parse(output);
        assert.deepEqual(parsed, {
            greeting: {
                hello: "Hello",
                goodbye: "Goodbye"
            },
            title: "My App"
        });
    });

    test("generates resource with plural forms", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "item_one", str: "{{count}} item", pluralForm: "one" },
            { sid: "item_other", str: "{{count}} items", pluralForm: "other" }
        ];
        const output = await resourceFilter.generateResource({ segments, translator: identityTranslator });
        const parsed = JSON.parse(output);
        assert.deepEqual(parsed, {
            item_one: "{{count}} item",
            item_other: "{{count}} items"
        });
    });

    test("generates simple resource from segments with notes", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            {
                sid: "hello",
                str: "Hello World",
                notes: "greeting message"  // notes are ignored in generateResource
            }
        ];
        const output = await resourceFilter.generateResource({ segments, translator: identityTranslator });
        const parsed = JSON.parse(output);
        assert.deepEqual(parsed, {
            hello: "Hello World"  // Only the string value, no annotations
        });
    });

    test("roundtrip with plurals: parse then generate maintains all forms", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enablePluralSuffixes: true
        });
        const original = {
            item_one: "{{count}} item",
            item_other: "{{count}} items"
        };

        // Parse - this will add missing forms
        const { segments } = await resourceFilter.parseResource({
            resource: JSON.stringify(original)
        });

        // Generate back - this should also add missing forms
        const generated = await resourceFilter.generateResource({ segments, translator: identityTranslator });
        const parsed = JSON.parse(generated);

        // Should have all 6 forms
        assert.equal(Object.keys(parsed).length, 6);
        assert.equal(parsed.item_one, "{{count}} item");
        assert.equal(parsed.item_other, "{{count}} items");
        assert.equal(parsed.item_zero, "{{count}} items");
        assert.equal(parsed.item_two, "{{count}} items");
        assert.equal(parsed.item_few, "{{count}} items");
        assert.equal(parsed.item_many, "{{count}} items");
    });
})

suite("generateResource with translator tests", () => {
    test("translates segments during generation", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "hello", str: "Hello" },
            { sid: "goodbye", str: "Goodbye" }
        ];
        const translator = async (seg) => ({ str: `${seg.str} (translated)` });

        const output = await resourceFilter.generateResource({ segments, translator });
        const parsed = JSON.parse(output);

        assert.equal(parsed.hello, "Hello (translated)");
        assert.equal(parsed.goodbye, "Goodbye (translated)");
    });

    test("translates nested resources", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "greeting.hello", str: "Hello" },
            { sid: "greeting.goodbye", str: "Goodbye" }
        ];
        const translator = async (seg) => ({ str: seg.str.toUpperCase() });

        const output = await resourceFilter.generateResource({ segments, translator });
        const parsed = JSON.parse(output);

        assert.deepEqual(parsed, {
            greeting: {
                hello: "HELLO",
                goodbye: "GOODBYE"
            }
        });
    });

    test("translates plural forms", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "item_one", str: "{{count}} item", pluralForm: "one" },
            { sid: "item_other", str: "{{count}} items", pluralForm: "other" }
        ];
        const translator = async (seg) => ({ str: seg.str.replace('item', 'elemento').replace('items', 'elementos') });

        const output = await resourceFilter.generateResource({ segments, translator });
        const parsed = JSON.parse(output);

        assert.equal(parsed.item_one, "{{count}} elemento");
        assert.equal(parsed.item_other, "{{count}} elementos");
    });

    test("skips segments when translator returns null", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "hello", str: "Hello" },
            { sid: "goodbye", str: "Goodbye" },
            { sid: "skip", str: "Skip this" }
        ];
        const translator = async (seg) => {
            if (seg.sid === "skip") return null;
            return { str: `${seg.str} (translated)` };
        };

        const output = await resourceFilter.generateResource({ segments, translator });
        const parsed = JSON.parse(output);

        assert.equal(parsed.hello, "Hello (translated)");
        assert.equal(parsed.goodbye, "Goodbye (translated)");
        assert.equal(parsed.skip, undefined);
    });

    test("translates segments with notes (notes are ignored)", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            {
                sid: "hello",
                str: "Hello {{name}}",
                notes: "greeting message\nPH({{name}}|John|User name)"  // notes ignored
            }
        ];
        const translator = async (seg) => ({ str: seg.str.replace("Hello", "Hola") });

        const output = await resourceFilter.generateResource({ segments, translator });
        const parsed = JSON.parse(output);

        assert.equal(parsed.hello, "Hola {{name}}");
        // No annotations in output
        assert.equal(Object.keys(parsed).length, 1);
    });

    test("translator receives correct segment object", async () => {
        const resourceFilter = new i18next.I18nextFilter();
        const segments = [
            { sid: "test.key", str: "Test value", notes: "some note" }
        ];
        const calls = [];
        const translator = async (seg) => {
            calls.push(seg);
            return { str: seg.str };
        };

        await resourceFilter.generateResource({ segments, translator });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].sid, "test.key");
        assert.equal(calls[0].str, "Test value");
        assert.equal(calls[0].notes, "some note");
    });

})
