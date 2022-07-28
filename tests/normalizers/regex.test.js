import { getNormalizedString } from '../../src/normalizers/util.js';
import { xmlDecoder, bracePHDecoder, iosPHDecoder, xmlEntityDecoder, javaEscapesDecoder,
    javaMFQuotesDecoder, gatedEncoder, xmlEntityEncoder, regexMatchingEncoderMaker, findFlagValue } from '../../src/normalizers/regex.js';

describe('Regex Encoder tests', () => {

    test('html plus braces', async () => {
        expect(getNormalizedString(
            `<icon name='location'/>Price&amp;&#65;:\\n\\'{0,number,integer}\\"\\u0020&#xa0;<color name='green'>{1}</color>`,
            [ xmlDecoder, bracePHDecoder, xmlEntityDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            { t: 'x', v: "<icon name='location'/>" },
            "Price&A:\n'",
            { t: 'x', v: '{0,number,integer}' },
            '" \u00a0',
            { t: 'bx', v: "<color name='green'>" },
            { t: 'x', v: '{1}' },
            { t: 'ex', v: '</color>' }
        ]);
    });

    test('1 ios string', async () => {
        expect(getNormalizedString(
            `Current viewer: %@`,
            [ iosPHDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            "Current viewer: ",
            { t: 'x', v: '%@' }
        ]);
    });

    test('2 ios strings', async () => {
        expect(getNormalizedString(
            `First viewer: %1$@\\n%2$@ is the second one`,
            [ javaEscapesDecoder, iosPHDecoder ]
        )).toMatchObject([
            "First viewer: ",
            { t: 'x', v: '%1$@' },
            "\n",
            { t: 'x', v: '%2$@' },
            " is the second one"
        ]);
    });

    test('ios with html', async () => {
        expect(getNormalizedString(
            "you are eligible for a future travel credit with %1$@. we will charge a rebooking fee of <color name='yellow'><b>%2$@ per passenger</b></color> when you use this credit to make a new booking.",
            [ iosPHDecoder, xmlDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            'you are eligible for a future travel credit with ',
            { t: 'x', v: '%1$@' },
            '. we will charge a rebooking fee of ',
            { t: 'bx', v: "<color name='yellow'>" },
            { t: 'bx', v: '<b>' },
            { t: 'x', v: '%2$@' },
            ' per passenger',
            { t: 'ex', v: '</b>' },
            { t: 'ex', v: '</color>' },
            ' when you use this credit to make a new booking.'
          ]);
    });

    test('gatedEncoder', async () => {
        expect(gatedEncoder(xmlEntityEncoder, 'foo')('<b>')).toBe('<b>');
        expect(gatedEncoder(xmlEntityEncoder, 'foo')('<b>', { foo: true })).toBe('&lt;b>');
    });

    test('regexMatchingEncoderMaker', async () => {
        //No match found, input returned
        expect(regexMatchingEncoderMaker('foo', /(?<protector>protector:\w+)/g, 
            { 'protector:House': { 'l10n-adhoc-requests': { 'da-DK-x-MMT' : 'Lannister' } } })
            ('test', { targetLang: 'da-DK-x-MMT', prj: 'l10n-adhoc-requests' })).toMatch(/test/);

        //Match found for str, but no matching flags found, input returned
        expect(regexMatchingEncoderMaker('foo', /(?<protector>protector:\w+)/g, 
            { 'protector:House': { 'l10n-adhoc-requests1': { 'da-DK-x-MMT' : 'Lannister' } } })
            ('protector:House', { targetLang: 'da-DK-x-MMT', prj: 'l10n-adhoc-requests' })).toMatch(/protector:House/);

        //Match found for str, but no matching flags found, input returned
        expect(regexMatchingEncoderMaker('foo', /(?<protector>protector:\w+)/g, 
            { 'protector:House': { 'l10n-adhoc-requests1': { 'da-DK-x-MMT' : 'Lannister' } } })
            ('protector:House', { targetLang: 'da-DK-x-MMT', prj: 'l10n-adhoc-requests' })).toMatch(/protector:House/);

        //Match found, no flags, input returned
        expect(regexMatchingEncoderMaker('foo', /(?<protector>protector:\w+)/g, 
            { 'protector:House': 'Lannister' })
            ('protector:House', { targetLang: 'da-DK-x-MMT', prj: 'l10n-adhoc-requests' })).toMatch(/Lannister/);

        //Match found, input returned
        expect(regexMatchingEncoderMaker('protectedStringsDecoder', /(?<protector>protector:\w+)/g, 
            { 'protector:House': { 'l10n-adhoc-requests': { 'da-DK-x-MMT' : 'Lannister' } } })
            ('protector:House', { targetLang: 'da-DK-x-MMT', prj: 'l10n-adhoc-requests' })).toMatch(/Lannister/);

    });

    test('java variable with single quote', async () => {
        expect(getNormalizedString("For {0}. This is a great deal, but this price won''t last.",[ javaMFQuotesDecoder, javaEscapesDecoder, bracePHDecoder, xmlEntityDecoder ]))
        .toMatchObject([
            "For ",
            {"t": "x", "v": "{0}"},
            ". This is a great deal, but this price won't last."
        ]);
    });

    test('findFlagValue', async () => {
        const flags = { targetLang: 'da-DK-x-MMT', prj: 'l10n-adhoc-requests' };
        expect(findFlagValue({  }, flags)).toBeUndefined();
        expect(findFlagValue('test', flags)).toBeUndefined();
        expect(findFlagValue({ 'fr-FR': 'Lannister' }, flags)).toBeUndefined();
        expect(findFlagValue({ 'da-DK-x-MMT': { 'anotherPrj' : 'Lannister' } }, flags)).toBeUndefined();
        expect(findFlagValue({ 'anotherPrj': { 'da-DK-x-MMT' : 'Lannister' } }, flags)).toBeUndefined();
        expect(findFlagValue({ 'da-DK-x-MMT': 'Lannister' }, flags)).toMatch(/Lannister/);
        expect(findFlagValue({ 'l10n-adhoc-requests': 'Lannister' }, flags)).toMatch(/Lannister/);
        expect(findFlagValue({ 'da-DK-x-MMT': { 'l10n-adhoc-requests' : 'Lannister' } }, flags)).toMatch(/Lannister/);
        expect(findFlagValue({ 'l10n-adhoc-requests': { 'da-DK-x-MMT' : 'Lannister' } }, flags)).toMatch(/Lannister/);
    });

});
