import { decodeString } from '../../normalizers/util.js';
import { xmlDecoder, bracePHDecoder, iosPHDecoder, xmlEntityDecoder, javaEscapesDecoder } from '../../normalizers/regex.js';

describe('Regex Encoder tests', () => {

    test('html plus braces', async () => {
        expect(decodeString(
            `<icon name='location'/>Price&amp;&#65;:\\n\\'{0,number,integer}\\"\\u0020<color name='green'>{1}</color>`,
            [ xmlDecoder, bracePHDecoder, xmlEntityDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            { t: 'x', v: "<icon name='location'/>" },
            "Price&A:\n'",
            { t: 'x', v: '{0,number,integer}' },
            '" ',
            { t: 'bx', v: "<color name='green'>" },
            { t: 'x', v: '{1}' },
            { t: 'ex', v: '</color>' }
        ]);
    });

    test('1 ios string', async () => {
        expect(decodeString(
            `Current viewer: %@`,
            [ iosPHDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            "Current viewer: ",
            { t: 'x', v: '%@' }
        ]);
    });

    test('2 ios strings', async () => {
        expect(decodeString(
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
        expect(decodeString(
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
});
