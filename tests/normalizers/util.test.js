import { flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1 } from '../../src/normalizers/util.js';

const nsrc1 = [
    { t: 'x', v: "<icon name='location'/>" },
    "Price&A:\n'",
    { t: 'x', v: '{0,number,integer}' },
    '" \u00a0',
    { t: 'bx', v: "<color name='green'>" },
    { t: 'x', v: '{1}' },
    { t: 'ex', v: '</color>' }
];

const phMap1 = {
    a: {
        t: "x",
        v: "<icon name='location'/>",
        v1: "a_x_icon",
    },
    b: {
        t: "x",
        v: "{0,number,integer}",
        v1: "b_x_0",
    },
    c: {
        t: "bx",
        v: "<color name='green'>",
        v1: "c_bx_color",
    },
    d: {
        t: "x",
        v: "{1}",
        v1: "d_x_1",
    },
    e: {
        t: "ex",
        v: "</color>",
        v1: "e_ex_color",
    }
};

const xml1 = '<a />Price&A:\n\'<b />"  <c /><d /><e />';

describe('Normalizers Util tests', () => {

    test('flattenNormalizedSourceToXmlV1', async () => {
        const xml = flattenNormalizedSourceToXmlV1(nsrc1);
        expect(xml).toEqual([ xml1, phMap1 ]);
    });

    test('extractNormalizedPartsFromXmlV1', async () => {
        expect(extractNormalizedPartsFromXmlV1(xml1, phMap1))
            .toMatchObject(nsrc1);
    });

    test('xmlRoundtripNoMarkup', async () => {
        const [ xml, phMap ] = flattenNormalizedSourceToXmlV1([ 'foo' ]);
        expect(extractNormalizedPartsFromXmlV1(xml, phMap))
            .toMatchObject([ 'foo' ]);
    });
});
