import * as json from "../../filters/json";

describe("json parseResource - description", () => {
    const resourceFilter = new json.JsonFilter({
        enableARBAnnotations: true,
    });
    test("parseResource returns raw parsed resource for simple string", async () => {
        const input = {
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
                    notes: "header - This is the welcome message subtitle on the home page",
                },
            ],
        };
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });

    test("parseResource returns raw parsed resource for simple string description after property", async () => {
        const input = {
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            homeSubtitle: "Book the trip you've been waiting for.",
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "homeSubtitle",
                    str: "Book the trip you've been waiting for.",
                    notes: "header - This is the welcome message subtitle on the home page",
                },
            ],
        };
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });

    test("parseResource returns raw parsed resource for nested strings", async () => {
        const input = {
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
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });
});
describe("json parseResource - no options", () => {
    const resourceFilter = new json.JsonFilter();
    test("parseResource returns raw parsed resource for simple string", async () => {
        const input = {
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
            ],
        };
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });

    test("parseResource returns raw parsed resource for simple string description after property", async () => {
        const input = {
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
            homeSubtitle: "Book the trip you've been waiting for.",
        };
        const expectedOutput = {
            segments: [
                {
                    sid: "homeSubtitle",
                    str: "Book the trip you've been waiting for.",
                },
            ],
        };
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });

    test("parseResource returns raw parsed resource for nested strings", async () => {
        const input = {
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
                    sid: "flightHome.subtitle",
                    str: "Book the trip you've been waiting for.",
                },
            ],
        };
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });
});

describe("json parseResource -  plurals", () => {
    const resourceFilter = new json.JsonFilter({
        enableARBAnnotations: true,
        enablePluralSuffixes: true,
    });
    test("parseResource returns raw parsed resource for plural", async () => {
        const input = {
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
        const output = await resourceFilter.parseResource(input);
        expect(output).toMatchObject(expectedOutput);
    });
});

describe("json generateTranslatedResource - emit comments", () => {
    const resourceFilter = new json.JsonFilter({
        enableARBAnnotations: true,
        enablePluralSuffixes: true,
        emitComments: true,
    });

    const translator = async function translate(sid, str) {
        return `${sid} ${str} - **Translation**`;
    }
    
    test("parseResource returns raw parsed resource for plural", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
        };
        const expectedOutput = {
            homeSubtitle: "homeSubtitle Book the trip you've been waiting for. - **Translation**",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
        };

        const output = await resourceFilter.generateTranslatedResource({resource, translator});
        console.log(JSON.stringify(output, null, 2));
        expect(output).toMatchObject(expectedOutput);
    });
});

describe("json generateTranslatedResource - don't emit comments", () => {
    const resourceFilter = new json.JsonFilter({
        enableARBAnnotations: true,
        enablePluralSuffixes: true,
    });

    const translator = async function translate(sid, str) {
        return `${sid} ${str} - **Translation**`;
    }
    
    test("parseResource returns raw parsed resource for plural", async () => {
        const resource = {
            homeSubtitle: "Book the trip you've been waiting for.",
            "@homeSubtitle": {
                description:
                    "header - This is the welcome message subtitle on the home page",
            },
        };
        const expectedOutput = {
            homeSubtitle: "homeSubtitle Book the trip you've been waiting for. - **Translation**",
        };

        const output = await resourceFilter.generateTranslatedResource({resource, translator});
        console.log(JSON.stringify(output, null, 2));
        expect(output).toMatchObject(expectedOutput);
    });
});
