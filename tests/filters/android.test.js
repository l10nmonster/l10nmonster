/* eslint-disable no-useless-escape */
const android = require('@l10nmonster/helpers-android');
const { utils, normalizers, xml } = require('@l10nmonster/helpers');
const fs = require('fs');

describe('android filter tests', () => {

  const resourceFilter = new android.Filter({comment: 'test'});
  const resourceId = "files/values/strings.xml";

  test('parseResource returns raw parsed resource', async () => {
    const expectedOutput = {
        "segments": [{
            "sid": "str1",
            "str": "Winter is coming"
        }, {
            "sid": "move_x_to",
            "str": "Move %1$s to…"
        }, {
            "isSuffixPluralized": true,
            "sid": "chapters_plural_one",
            "str": "%1$d chapter"
        }, {
            "isSuffixPluralized": true,
            "sid": "chapters_plural_other",
            "str": "%1$d chapters"
        }]
    };
    const resource = fs.readFileSync(resourceId,'utf8');
    const output = await resourceFilter.parseResource({resource, isSource: true});
    expect(output).toMatchObject(expectedOutput);
  });

  const translator = async function translate(sid, str) {
    return sid === 'str1' ? undefined : `${resourceId} ${sid} ${str} - **Translation**`;
  }
  test('translateResource returns string', async () => {
    const expectedOutput = fs.readFileSync('files/values/strings_t9n.xml', 'utf8');
    const resource = fs.readFileSync(resourceId,'utf8');
    const lang = 'fil';
    const translatedRes = await resourceFilter.translateResource({ resourceId, resource, lang, translator });
    expect(translatedRes).toBe(expectedOutput);
  });

    test('android normalizers work as expected', async () => {
        const encodings = fs.readFileSync('files/values/encodings.xml', 'utf8');
        const encodingsRes = await resourceFilter.parseResource({resource: encodings, isSource: true});
        const standardDecoders = [ xml.entityDecoder, xml.CDataDecoder, android.spaceCollapser, android.escapesDecoder, android.phDecoder, normalizers.doublePercentDecoder ];
        expect(encodingsRes)
            .toMatchObject({ "segments": [{
                    "sid": "cdata",
                    "str": "<![CDATA[gotta 'love' this!]]>"
                }, {
                    "sid": "quotes",
                    "str": "\"it's magic\""
                }, {
                    "sid": "chapter_x_of_y",
                    "str": "Chapter %1$d of %2$d"
                }, {
                    "sid": "quotes",
                    "str": "nothing to \"see\" here\\n"
                }, {
                    "sid": "space",
                    "str": "\" space \""
                }, {
                    "sid": "spaceTrimming",
                    "str": "sp    ace"
                }, {
                    "sid": "new",
                    "str": "What\\'s new\\n"
                }, {
                    "sid": "html",
                    "str": "&lt;b>bold&lt;/b>"
                }, {
                    "sid": "escapedSingleQuoteInCdata",
                    "str": "<![CDATA[Winter is <strong><color name=\\'orange\\'>coming</color></strong>]]>"
                }, {
                    "sid": "escapedDoubleQuoteInCdata",
                    "str": "<![CDATA[Winter is <strong><color name=\\\"orange\\\">coming</color></strong>]]>"
                }, {
                    "sid": "percent",
                    "str": "one % two %% escaped \\u0025"
                }
            ]});
        expect(utils.getNormalizedString(encodingsRes.segments[0].str, [xml.CDataDecoder])[0])
            .toBe("gotta 'love' this!");
        expect(utils.getNormalizedString(encodingsRes.segments[1].str, [xml.CDataDecoder])[0])
            .toBe("it's magic");
        const nsrc2 = ["Chapter ", {"t": "x","v": "%1$d"}, " of ", {"t": "x","v": "%2$d"}];
        expect(utils.getNormalizedString(encodingsRes.segments[2].str, [android.phDecoder]))
            .toMatchObject(nsrc2);
        const econdedNsrc2 = nsrc2.map(p => (typeof p === 'string' ? android.escapesEncoder(p) : p));
        expect(econdedNsrc2)
            .toMatchObject(["Chapter ", {"t": "x","v": "%1$d"}, " of ", {"t": "x","v": "%2$d"}]);
        expect(utils.getNormalizedString(encodingsRes.segments[3].str, [android.escapesDecoder])[0])
            .toBe('nothing to "see" here\n');
        expect(utils.getNormalizedString(encodingsRes.segments[4].str, [xml.CDataDecoder])[0])
            .toBe(" space ");
        expect(utils.getNormalizedString(encodingsRes.segments[5].str, [android.spaceCollapser])[0])
            .toBe("sp ace");
        expect(utils.getNormalizedString(encodingsRes.segments[6].str, standardDecoders)[0])
            .toBe("What's new\n");
        const nsrc7 = [{"t": "bx","v": "<b>"}, "bold", {"t": "ex","v": "</b>"}];
        expect(utils.getNormalizedString(encodingsRes.segments[7].str, [...standardDecoders, xml.tagDecoder]))
            .toMatchObject(nsrc7);
        expect(utils.getNormalizedString(encodingsRes.segments[8].str, [xml.CDataDecoder])[0])
            .toBe("Winter is <strong><color name=\\'orange\\'>coming</color></strong>");
        expect(utils.getNormalizedString(encodingsRes.segments[9].str, [xml.CDataDecoder])[0])
            .toBe("Winter is <strong><color name=\\\"orange\\\">coming</color></strong>");
        expect(utils.getNormalizedString(encodingsRes.segments[10].str, [android.escapesDecoder])[0])
            .toBe("one % two %% escaped %");
        expect(utils.getNormalizedString(encodingsRes.segments[10].str, [normalizers.doublePercentDecoder])[0])
            .toBe("one % two % escaped \\u0025");
        expect(utils.getNormalizedString(encodingsRes.segments[10].str, standardDecoders)[0])
            .toBe("one % two % escaped %");
        });
});
