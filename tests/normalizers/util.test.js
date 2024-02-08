/* eslint-disable camelcase */
const { utils } = require('@l10nmonster/helpers');
const {
    flattenNormalizedSourceV1, extractNormalizedPartsV1,
    flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1,
    extractStructuredNotes, getTUMaps,
 } = utils;

const nsrc1 = [
    { t: 'x', v: "<icon name='location'/>" },
    "Price&A:\n'",
    { t: 'x', v: '{0,number,integer}', s: '$10' },
    '" \u00a0',
    { t: 'bx', v: "<color name='green'>" },
    { t: 'x', v: '{1}' },
    { t: 'ex', v: '</color>' }
];

const phMap1 = {
    a_x_icon: {
        t: "x",
        v: "<icon name='location'/>",
        v1: "a_x_icon",
    },
    b_x_0: {
        t: "x",
        v: "{0,number,integer}",
        s: '$10',
        v1: "b_x_0",
    },
    c_bx_color: {
        t: "bx",
        v: "<color name='green'>",
        v1: "c_bx_color",
    },
    d_x_1: {
        t: "x",
        v: "{1}",
        v1: "d_x_1",
    },
    e_ex_color: {
        t: "ex",
        v: "</color>",
        v1: "e_ex_color",
    }
};

const v1String1 = '{{a_x_icon}}Price&A:\n\'{{b_x_0}}"  {{c_bx_color}}{{d_x_1}}{{e_ex_color}}';

const xml1 = '<x1 />Price&A:\n\'<x2>$10</x2>"  <x3><x4 /></x3>';

const xmlPhMap1 = {
    x1: {
        t: "x",
        v: "<icon name='location'/>",
        v1: "a_x_icon",
    },
    x2: {
        t: "x",
        v: "{0,number,integer}",
        s: '$10',
        v1: "b_x_0",
    },
    bx3: {
        t: "bx",
        v: "<color name='green'>",
        v1: "c_bx_color",
    },
    x4: {
        t: "x",
        v: "{1}",
        v1: "d_x_1",
    },
    ex3: {
        t: "ex",
        v: "</color>",
        v1: "e_ex_color",
    }
};
const tuWithPh = [
    {
        "guid": "foo",
        "notes": {
            "ph": {
                "{0}": { "sample": "12 May, 2023", "desc": "Departure date" },
                "{1}": { "sample": "23 May, 2023", "desc": "Return date" },
                "{2}": { "sample": "2", "desc": "Number of travellers" }
            },
        },
        "nsrc": [
            "Round Trip, ",
            { "t": "x", "v": "{0}" },
            " - ",
            { "t": "x", "v": "{1}" },
            " • ",
            { "t": "x", "v": "{2}" }
        ],
        "ntgt": [
            "Ida y vuelta, ",
            { "t": "x", "v": "{0}", "v1": "a_x_0" },
            " - ",
            { "t": "x", "v": "{1}", "v1": "b_x_1" },
            " • ",
            { "t": "x", "v": "{2}", "v1": "c_x_2" }
        ],
    },
];
const tuWithPhMap = {
    "contentMap": {
      "foo": "Round Trip, {{a_x_0}} - {{b_x_1}} • {{c_x_2}}"
    },
    "tuMeta": {
      "foo": {
        "phMap": {
          "a_x_0": {
            "t": "x",
            "v": "{0}",
            "v1": "a_x_0"
          },
          "b_x_1": {
            "t": "x",
            "v": "{1}",
            "v1": "b_x_1"
          },
          "c_x_2": {
            "t": "x",
            "v": "{2}",
            "v1": "c_x_2"
          }
        },
        "nsrc": [
            "Round Trip, ",
            { "t": "x", "v": "{0}" },
            " - ",
            { "t": "x", "v": "{1}" },
            " • ",
            { "t": "x", "v": "{2}" }
        ],
      }
    },
    "phNotes": {
      "foo": "\n ph:\n  ①  a_x_0 → {0} → 12 May, 2023   (Departure date)\n  ②  b_x_1 → {1} → 23 May, 2023   (Return date)\n  ③  c_x_2 → {2} → 2   (Number of travellers)\n current translation: Ida y vuelta, {{a_x_0}} - {{b_x_1}} • {{c_x_2}}"
    }
  };

describe('Normalizers Util tests', () => {

    test('flattenNormalizedSourceV1', async () => {
        const xml = flattenNormalizedSourceV1(nsrc1);
        expect(xml).toEqual([ v1String1, phMap1 ]);
    });

    test('extractNormalizedPartsV1', async () => {
        expect(extractNormalizedPartsV1(v1String1, phMap1))
            .toMatchObject(nsrc1);
    });

    test('flattenNormalizedSourceToXmlV1', async () => {
        const xml = flattenNormalizedSourceToXmlV1(nsrc1);
        expect(xml).toEqual([ xml1, xmlPhMap1 ]);
    });

    test('extractNormalizedPartsFromXmlV1', async () => {
        expect(extractNormalizedPartsFromXmlV1(xml1, xmlPhMap1))
            .toMatchObject(nsrc1);
    });

    test('xmlRoundtripNoMarkup', async () => {
        const [ xml, phMap ] = flattenNormalizedSourceToXmlV1([ 'foo&bar <8' ]);
        expect(extractNormalizedPartsFromXmlV1(xml, phMap))
            .toMatchObject([ 'foo&bar <8' ]);
    });

    test('extractStructuredNotes no annotations', async () => {
        expect(extractStructuredNotes('foo'))
            .toMatchObject({
                desc: 'foo',
            });
    });

    test('simple extractStructuredNotes', async () => {
        expect(extractStructuredNotes('fooPH(0 | SF | city)MAXWIDTH(42)SCREENSHOT(http://sample.org)TAG(a, b)'))
            .toMatchObject({
                desc: 'foo',
                ph: {
                    0: {
                        sample: 'SF',
                        desc: 'city',
                    }
                },
                maxWidth: 42,
                screenshot: 'http://sample.org',
                tags: [ 'a', 'b' ],
            });
    });

    test('nested extractStructuredNotes', async () => {
        expect(extractStructuredNotes('fooPH(duh(0)|SF|city)'))
            .toMatchObject({
                desc: 'foo',
                ph: {
                    'duh(0)': {
                        sample: 'SF',
                        desc: 'city',
                    }
                },
            });
    });

    test('getTUMaps', async () => {
        expect(getTUMaps(tuWithPh))
            .toMatchObject(tuWithPhMap);
    });
});
