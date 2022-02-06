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

    test('ios strings', async () => {
        expect(decodeString(
            `Current viewer: %1$@`,
            [ iosPHDecoder, javaEscapesDecoder ]
        )).toMatchObject([
            "Current viewer: ",
            { t: 'ph', v: '%1$@' }
        ]);
    });

});
