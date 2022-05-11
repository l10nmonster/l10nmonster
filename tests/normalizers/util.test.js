import { flattenNormalizedSourceToXmlV1, extractNormalizedPartsFromXmlV1 } from '../../normalizers/util.js';

const nsrc1 = [
    { t: 'x', v: "<icon name='location'/>" },
    "Price&A:\n'",
    { t: 'x', v: '{0,number,integer}' },
    '" \u00a0',
    { t: 'bx', v: "<color name='green'>" },
    { t: 'x', v: '{1}' },
    { t: 'ex', v: '</color>' }
];

const phMap1 = {};

describe('Normalizers Util tests', () => {

    test('flattenNormalizedSourceToXmlV1', async () => {
        console.dir(flattenNormalizedSourceToXmlV1(nsrc1))
        expect(flattenNormalizedSourceToXmlV1(nsrc1)).toMatchArray(['', []]);
    });

    test('extractNormalizedPartsFromXmlV1', async () => {
        expect(extractNormalizedPartsFromXmlV1('', phMap1))
            .toMatchObject(nsrc1);
    });

});
