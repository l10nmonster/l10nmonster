/* eslint-disable no-useless-escape */
import * as android from '../../src/filters/android';
import { getNormalizedString } from '../../src/normalizers/util.js';
import { xmlCDataDecoder, iosPHDecoder, androidEscapesDecoder,
    androidSpaceCollapser, xmlEntityDecoder, androidEscapesEncoder, xmlDecoder, doublePercentDecoder } from '../../src/normalizers/regex.js';
import { readFileSync } from 'fs';

describe('android filter tests', () => {

  const resourceFilter = new android.AndroidFilter({comment: 'test'});
  const resourceId = "tests/files/values/strings.xml";

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
    const resource = readFileSync(resourceId,'utf8');
    const output = await resourceFilter.parseResource({resource, isSource: true});
    expect(output).toMatchObject(expectedOutput);
  });

  const translator = async function translate(sid, str) {
    return sid === 'str1' ? undefined : `${resourceId} ${sid} ${str} - **Translation**`;
  }
  test('translateResource returns string', async () => {
    const expectedOutput = readFileSync('tests/files/values/strings_t9n.xml', 'utf8');
    const resource = readFileSync(resourceId,'utf8');
    const lang = 'fil';
    const translatedRes = await resourceFilter.translateResource({ resourceId, resource, lang, translator });
    expect(translatedRes).toBe(expectedOutput);
  });

    test('android normalizers work as expected', async () => {
        const encodings = readFileSync('tests/files/values/encodings.xml', 'utf8');
        const encodingsRes = await resourceFilter.parseResource({resource: encodings, isSource: true});
        const standardDecoders = [ xmlEntityDecoder, xmlCDataDecoder, androidSpaceCollapser, androidEscapesDecoder, iosPHDecoder, doublePercentDecoder ];
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
        expect(getNormalizedString(encodingsRes.segments[0].str, [xmlCDataDecoder])[0])
            .toBe("gotta 'love' this!");
        expect(getNormalizedString(encodingsRes.segments[1].str, [xmlCDataDecoder])[0])
            .toBe("it's magic");
        const nsrc2 = ["Chapter ", {"t": "x","v": "%1$d"}, " of ", {"t": "x","v": "%2$d"}];
        expect(getNormalizedString(encodingsRes.segments[2].str, [iosPHDecoder]))
            .toMatchObject(nsrc2);
        const econdedNsrc2 = nsrc2.map(p => (typeof p === 'string' ? androidEscapesEncoder(p) : p));
        expect(econdedNsrc2)
            .toMatchObject(["Chapter ", {"t": "x","v": "%1$d"}, " of ", {"t": "x","v": "%2$d"}]);
        expect(getNormalizedString(encodingsRes.segments[3].str, [androidEscapesDecoder])[0])
            .toBe('nothing to "see" here\n');
        expect(getNormalizedString(encodingsRes.segments[4].str, [xmlCDataDecoder])[0])
            .toBe(" space ");
        expect(getNormalizedString(encodingsRes.segments[5].str, [androidSpaceCollapser])[0])
            .toBe("sp ace");
        expect(getNormalizedString(encodingsRes.segments[6].str, standardDecoders)[0])
            .toBe("What's new\n");
        const nsrc7 = [{"t": "bx","v": "<b>"}, "bold", {"t": "ex","v": "</b>"}];
        expect(getNormalizedString(encodingsRes.segments[7].str, [...standardDecoders, xmlDecoder]))
            .toMatchObject(nsrc7);
        expect(getNormalizedString(encodingsRes.segments[8].str, [xmlCDataDecoder])[0])
            .toBe("Winter is <strong><color name=\\'orange\\'>coming</color></strong>");
        expect(getNormalizedString(encodingsRes.segments[9].str, [xmlCDataDecoder])[0])
            .toBe("Winter is <strong><color name=\\\"orange\\\">coming</color></strong>");
        expect(getNormalizedString(encodingsRes.segments[10].str, [androidEscapesDecoder])[0])
            .toBe("one % two %% escaped %");
        expect(getNormalizedString(encodingsRes.segments[10].str, [doublePercentDecoder])[0])
            .toBe("one % two % escaped \\u0025");
        expect(getNormalizedString(encodingsRes.segments[10].str, standardDecoders)[0])
            .toBe("one % two % escaped %");
        });
});
