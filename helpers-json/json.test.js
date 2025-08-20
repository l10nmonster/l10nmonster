/* eslint-disable camelcase */
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
        enablePluralSuffixes: true,
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
                    isSuffixPluralized: true,
                    notes: "copy - time copy for day singular",
                },
                {
                    sid: "timeCount.day_other",
                    str: "{{count}} days",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_zero",
                    str: "{{count}} days",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_two",
                    str: "{{count}} days",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_few",
                    str: "{{count}} days",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.day_many",
                    str: "{{count}} days",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for days plural",
                },
                {
                    sid: "timeCount.second_one",
                    str: "{{count}} second",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for second singular",
                },
                {
                    sid: "timeCount.second_other",
                    str: "{{count}} seconds",
                    isSuffixPluralized: true,
                    notes: "copy - time copy for seconds plural",
                },
            ],
        };
        const output = await resourceFilter.parseResource({ resource: JSON.stringify(resource) });
        assert.deepEqual(output, expectedOutput);
    });
});

suite("json translateResource - emit annotations", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
        enablePluralSuffixes: true,
        emitArbAnnotations: true,
    });

    const translator = async function translate(sid, str) {
        return `${sid} ${str} - **Translation**`;
    };

    test("translateResource with descriptions", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            title: "<strong>Welcome back</strong> to travel.",
            "@title": {
                description: "header - welcome message of flight flow",
                context: "context attribute",
                type: "type attribute",
            },
        };
        const expectedOutput = {
            homeSubtitle:
                "homeSubtitle Book the trip you've been waiting for. - **Translation**",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            title: "title <strong>Welcome back</strong> to travel. - **Translation**",
            "@title": {
                description: "header - welcome message of flight flow",
                context: "context attribute",
                type: "type attribute",
            },
        };

        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });

    test("translateResource with plurals", async () => {
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
            timeCount: {
                day_one: "timeCount.day_one {{count}} day - **Translation**",
                "@day_one": {
                    description: "copy - time copy for day singular",
                },

                day_other:
                    "timeCount.day_other {{count}} days - **Translation**",
                "@day_other": {
                    description: "copy - time copy for days plural",
                },
                day_zero: "timeCount.day_zero {{count}} days - **Translation**",
                "@day_zero": {
                    description: "copy - time copy for days plural",
                },
                day_two: "timeCount.day_two {{count}} days - **Translation**",
                "@day_two": {
                    description: "copy - time copy for days plural",
                },
                day_few: "timeCount.day_few {{count}} days - **Translation**",
                "@day_few": {
                    description: "copy - time copy for days plural",
                },
                day_many: "timeCount.day_many {{count}} days - **Translation**",
                "@day_many": {
                    description: "copy - time copy for days plural",
                },
                second_one:
                    "timeCount.second_one {{count}} second - **Translation**",
                "@second_one": {
                    description: "copy - time copy for second singular",
                },

                second_other:
                    "timeCount.second_other {{count}} seconds - **Translation**",
                "@second_other": {
                    description: "copy - time copy for seconds plural",
                },
            },
        };
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });
});

suite("json translateResource - don't emit annotations", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
        enablePluralSuffixes: true,
    });

    const translator = async function translate(sid, str) {
        return `${sid} ${str} - **Translation**`;
    };

    test("translateResource with descriptions", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            title: "<strong>Welcome back</strong> to travel.",
            "@title": {
                description: "header - welcome message of flight flow",
                context: "context attribute",
                type: "type attribute",
            },
        };
        const expectedOutput = {
            homeSubtitle:
                "homeSubtitle Book the trip you've been waiting for. - **Translation**",
            title: "title <strong>Welcome back</strong> to travel. - **Translation**",
        };

        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });
});

suite("json translateResource - if no translation, delete annotations", () => {
    const resourceFilter = new i18next.I18nextFilter({
        enableArbAnnotations: true,
        enablePluralSuffixes: true,
        emitArbAnnotations: true,
    });

    const translator = async function translate(sid, str) {
        return sid === "homeSubtitle" ?
            null :
            `${sid} ${str} - **Translation**`;
    };

    test("translateResource with descriptions", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            title: "<strong>Welcome back</strong> to travel.",
            "@title": {
                description: "header - welcome message of flight flow",
                context: "context attribute",
                type: "type attribute",
            },
        };
        const expectedOutput = {
            title: "title <strong>Welcome back</strong> to travel. - **Translation**",
            "@title": {
                description: "header - welcome message of flight flow",
                context: "context attribute",
                type: "type attribute",
            },
        };

        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });
});

suite("json translateResource - enableArrays", () => {
    const translator = async function translate(sid, str) {
        return `${sid} ${str} - **Translation**`;
    };

    const resource = {
        test: { 0: 'zero', 1: 'one' }
    };

    test("translateResource with array enabled", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            enablePluralSuffixes: true,
            emitArbAnnotations: true,
            enableArrays: true
        });
        const expectedOutput = {
            "test": [
                "test.0 zero - **Translation**",
                "test.1 one - **Translation**"
            ]
        };
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });

    test("translateResource with array not enabled", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            enablePluralSuffixes: true,
            emitArbAnnotations: true,
            enableArrays: false
        });
        const expectedOutput = {
            "test": {
                "0": "test.0 zero - **Translation**",
                "1": "test.1 one - **Translation**"
              }
        };
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });

    test("translateResource with enableArrays default", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            enablePluralSuffixes: true,
            emitArbAnnotations: true
        });
        const expectedOutput = {
            "test": {
                "0": "test.0 zero - **Translation**",
                "1": "test.1 one - **Translation**"
              }
        };
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
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

    test("translateResource preserves deeply nested placeholder annotations when emitArbAnnotations is true", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            emitArbAnnotations: true,
        });
        const translator = async (sid, str) => `${str} - **Translated**`;
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
            recentSearch: {
                cars: {
                    differentPlaceDropOff: "Drop off at {{pickupLocationName}} instead of pickup location - **Translated**",
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
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });

    test("translateResource removes deeply nested placeholder annotations when emitArbAnnotations is false", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            emitArbAnnotations: false,
        });
        const translator = async (sid, str) => `${str} - **Translated**`;
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
            recentSearch: {
                cars: {
                    differentPlaceDropOff: "Drop off at {{pickupLocationName}} instead of pickup location - **Translated**"
                }
            }
        };
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
    });

    test("translateResource removes nested annotations when translation is null", async () => {
        const resourceFilter = new i18next.I18nextFilter({
            enableArbAnnotations: true,
            emitArbAnnotations: true,
        });
        const translator = async (sid, str) => {
            // Return null for the nested key to test annotation removal
            return sid === "recentSearch.cars.differentPlaceDropOff" ? null : `${str} - **Translated**`;
        };
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
                    },
                    anotherKey: "Another message"
                }
            }
        };
        const expectedOutput = {
            recentSearch: {
                cars: {
                    anotherKey: "Another message - **Translated**"
                }
            }
        };
        const output = await resourceFilter.translateResource({
            resource: JSON.stringify(resource),
            translator,
        });
        assert.deepEqual(JSON.parse(output), expectedOutput);
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
