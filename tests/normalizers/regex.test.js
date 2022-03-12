import { getNormalizedString } from '../../normalizers/util.js';
import { xmlDecoder, bracePHDecoder, iosPHDecoder, xmlEntityDecoder, javaEscapesDecoder,
    gatedEncoder, xmlEntityEncoder } from '../../normalizers/regex.js';

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
    
    //TODO: '' should be normalized to '
    test('java variable with single quote', async () => {
        expect(getNormalizedString("For {0}. This is a great deal, but this price won''t last.",[javaEscapesDecoder, bracePHDecoder, xmlEntityDecoder]
        )).toMatchObject([
            "For ", 
            {"t": "x", "v": "{0}"}, 
            ". This is a great deal, but this price won''t last."
        ]);
    });
    

});
