/* eslint-disable camelcase */
import {
    flattenNormalizedSourceV1, extractNormalizedPartsV1,
    flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1,
    extractStructuredNotes,
 } from '../../src/normalizers/util.js';

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
        expect(extractStructuredNotes('fooPH(0 | SF | city)MAXWIDTH(42)SCREENSHOT(http://sample.org)'))
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
});
