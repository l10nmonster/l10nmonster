import { decodeString } from '../../normalizers/util.js';
import { xmlDecoder, bracePHDecoder, iosPHDecoder, xmlEntityDecoder, javaEscapesDecoder } from '../../normalizers/regex.js';

describe('Regex Encoder tests', () => {

    test('html plus braces', async () => {
        expect(decodeString(
            `<icon name='location'/>Price&amp;&#65;:\\n\\'{0,number,integer}\\"\\u0020<color name='green'>{1}</color>`,
            [ xmlDecoder, bracePHDecoder, xmlEntityDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            { t: 'ph', v: "<icon name='location'/>" },
            "Price&A:\n'",
            { t: 'ph', v: '{0,number,integer}' },
            '" ',
            { t: 'ph', v: "<color name='green'>" },
            { t: 'ph', v: '{1}' },
            { t: 'ph', v: '</color>' }
        ]);
    });

    test('1 ios string', async () => {
        expect(decodeString(
            `Current viewer: %@`,
            [ iosPHDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            "Current viewer: ",
            { t: 'ph', v: '%@' }
        ]);
    });

    test('2 ios strings', async () => {
        console.dir(decodeString(
            `First viewer: %1$@\\n%2$@ is the second one`,
            [ iosPHDecoder, javaEscapesDecoder ]
        ))
        expect(decodeString(
            `First viewer: %1$@\\n%2$@ is the second one`,
            [ javaEscapesDecoder, iosPHDecoder ]
        )).toMatchObject([
            "First viewer: ",
            { t: 'ph', v: '%1$@' },
            "\n",
            { t: 'ph', v: '%2$@' },
            " is the second one"
        ]);
    });

    test('ios with html', async () => {
        expect(decodeString(
            "you are eligible for a future travel credit with %1$@. we will charge a rebooking fee of <color name='yellow'><b>%2$@ per passenger</b></color> when you use this credit to make a new booking.",
            [ iosPHDecoder, xmlDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            'you are eligible for a future travel credit with ',
            { t: 'ph', v: '%1$@' },
            '. we will charge a rebooking fee of ',
            { t: 'ph', v: "<color name='yellow'>" },
            { t: 'ph', v: '<b>' },
            { t: 'ph', v: '%2$@' },
            ' per passenger',
            { t: 'ph', v: '</b>' },
            { t: 'ph', v: '</color>' },
            ' when you use this credit to make a new booking.'
          ]);
    });
});
