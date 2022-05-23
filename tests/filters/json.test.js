import * as json from "../../filters/json";

describe("json parseResource - description", () => {
    const resourceFilter = new json.JsonFilter({
        enableArbAnnotations: true,
    });

    test("parseResource returns raw parsed resource for simple string no description", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "home@Subtitle": "@ Book the trip you've been waiting for.",
        };
        const expectedOutput = {
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
        expect(output).toMatchObject(expectedOutput);
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
        expect(output).toMatchObject(expectedOutput);
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
        expect(output).toMatchObject(expectedOutput);
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
        expect(output).toMatchObject(expectedOutput);
    });
});
describe("json parseResource - no options", () => {
    const resourceFilter = new json.JsonFilter();
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
        expect(output).toMatchObject(expectedOutput);
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
        expect(output).toMatchObject(expectedOutput);
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
        expect(output).toMatchObject(expectedOutput);
    });
});

describe("json parseResource -  plurals", () => {
    const resourceFilter = new json.JsonFilter({
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
        expect(output).toMatchObject(expectedOutput);
    });
});

describe("json translateResource - emit annotations", () => {
    const resourceFilter = new json.JsonFilter({
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
        expect(JSON.parse(output)).toMatchObject(expectedOutput);
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
        expect(JSON.parse(output)).toMatchObject(expectedOutput);
    });
});

describe("json translateResource - don't emit annotations", () => {
    const resourceFilter = new json.JsonFilter({
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
        expect(JSON.parse(output)).toMatchObject(expectedOutput);
    });
});

describe("json translateResource - if no translation, delete annotations", () => {
    const resourceFilter = new json.JsonFilter({
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
        expect(JSON.parse(output)).toMatchObject(expectedOutput);
    });
});
