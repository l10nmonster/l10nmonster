global.l10nmonster ??= {};
const { utils, normalizers, xml, regex } = require('@l10nmonster/helpers');
const ios = require('@l10nmonster/helpers-ios');
const java = require('@l10nmonster/helpers-java');

const locationsDecoder = regex.decoderMaker(
    'locationsDecoder',
    /(?<tag>.+)/g,
    (groups) => ([{ t: 'x', v: '{0}', s: 'I live in ' }, groups.tag])
);

describe('Regex Encoder tests', () => {

    test('html plus braces', async () => {
        expect(utils.getNormalizedString(
            `<icon name='location'/>Price&amp;&#65;:\\n\\'{0,number,integer}\\"\\u0020&#xa0;<color name='green'>{1}</color>`,
            [ xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder, java.escapesDecoder ]
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
        expect(utils.getNormalizedString(
            `Current viewer: %@`,
            [ ios.phDecoder, java.escapesDecoder ]
        )).toMatchObject([
            "Current viewer: ",
            { t: 'x', v: '%@' }
        ]);
    });

    test('2 ios strings', async () => {
        expect(utils.getNormalizedString(
            `First viewer: %1$@\\n%2$@ is the second one`,
            [ java.escapesDecoder, ios.phDecoder ]
        )).toMatchObject([
            "First viewer: ",
            { t: 'x', v: '%1$@' },
            "\n",
            { t: 'x', v: '%2$@' },
            " is the second one"
        ]);
    });

    test('3 ios.phDecoder', async () => {
        expect(utils.getNormalizedString(
            `Some nasty phs: %1$ld %02d %3$zd`,
            [ ios.phDecoder ]
        )).toMatchObject([
            "Some nasty phs: ",
            { t: 'x', v: '%1$ld' },
            " ",
            { t: 'x', v: '%02d' },
            " ",
            { t: 'x', v: '%3$zd' }
        ]);
    });

    test('ios with html', async () => {
        expect(utils.getNormalizedString(
            "you are eligible for a future travel credit with %1$@. we will charge a rebooking fee of <color name='yellow'><b>%2$@ per passenger</b></color> when you use this credit to make a new booking.",
            [ ios.phDecoder, xml.tagDecoder, java.escapesDecoder ]
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

    test('locations decoder', async () => {
        expect(utils.getNormalizedString(
            `Venice`,
            [ locationsDecoder ]
        )).toMatchObject([
            { s: 'I live in ', t: 'x', v: '{0}' },
            "Venice"
        ]);
    });

    test('normalizers.doublePercentEncoder', async () => {
        expect(normalizers.doublePercentEncoder('10%')).toBe('10%%');
    });

    test('normalizers.gatedEncoder', async () => {
        expect(normalizers.gatedEncoder(xml.entityEncoder, 'foo')('<b>')).toBe('<b>');
        expect(normalizers.gatedEncoder(xml.entityEncoder, 'foo')('<b>', { foo: true })).toBe('&lt;b>');
    });

    test('java variable with single quote', async () => {
        expect(utils.getNormalizedString("For {0}. This is a great deal, but this price won''t last.",[ java.MFQuotesDecoder, java.escapesDecoder, normalizers.bracePHDecoder, xml.entityDecoder ]))
        .toMatchObject([
            "For ",
            {"t": "x", "v": "{0}"},
            ". This is a great deal, but this price won't last."
        ]);
    });

});
