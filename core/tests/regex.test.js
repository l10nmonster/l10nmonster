import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import * as ios from '../../helpers-ios/index.js';
import * as java from '../../helpers-java/index.js';
import { utils, normalizers, xml, regex } from '../index.js';

const locationsDecoder = regex.decoderMaker(
    'locationsDecoder',
    /(?<tag>.+)/g,
    (groups) => ([{ t: 'x', v: '{0}', s: 'I live in ' }, groups.tag])
);

suite('Regex Encoder tests', () => {

    test('html plus braces', async () => {
        assert.deepEqual(utils.getNormalizedString(
            `<icon name='location'/>Price&amp;&#65;:\\n\\'{0,number,integer}\\"\\u0020&#xa0;<color name='green'>{1}</color>`,
            [ xml.tagDecoder, normalizers.bracePHDecoder, xml.entityDecoder, java.escapesDecoder ]
        ), [
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
        assert.deepEqual(utils.getNormalizedString(
            `Current viewer: %@`,
            [ ios.phDecoder, java.escapesDecoder ]
        ), [
            "Current viewer: ",
            { t: 'x', v: '%@' }
        ]);
    });

    test('2 ios strings', async () => {
        assert.deepEqual(utils.getNormalizedString(
            `First viewer: %1$@\\n%2$@ is the second one`,
            [ java.escapesDecoder, ios.phDecoder ]
        ), [
            "First viewer: ",
            { t: 'x', v: '%1$@' },
            "\n",
            { t: 'x', v: '%2$@' },
            " is the second one"
        ]);
    });

    test('3 ios.phDecoder', async () => {
        assert.deepEqual(utils.getNormalizedString(
            `Some nasty phs: %1$ld %02d %3$zd`,
            [ ios.phDecoder ]
        ), [
            "Some nasty phs: ",
            { t: 'x', v: '%1$ld' },
            " ",
            { t: 'x', v: '%02d' },
            " ",
            { t: 'x', v: '%3$zd' }
        ]);
    });

    test('ios with html', async () => {
        assert.deepEqual(utils.getNormalizedString(
            "you are eligible for a future travel credit with %1$@. we will charge a rebooking fee of <color name='yellow'><b>%2$@ per passenger</b></color> when you use this credit to make a new booking.",
            [ ios.phDecoder, xml.tagDecoder, java.escapesDecoder ]
        ), [
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
        assert.deepEqual(utils.getNormalizedString(
            `Venice`,
            [ locationsDecoder ]
        ), [
            { s: 'I live in ', t: 'x', v: '{0}' },
            "Venice"
        ]);
    });

    test('normalizers.doublePercentEncoder', async () => {
        assert.equal(normalizers.doublePercentEncoder('10%'), '10%%');
    });

    test('normalizers.gatedEncoder', async () => {
        assert.equal(normalizers.gatedEncoder(xml.entityEncoder, 'foo')('<b>'), '<b>');
        assert.equal(normalizers.gatedEncoder(xml.entityEncoder, 'foo')('<b>', { foo: true }), '&lt;b>');
    });

    test('java variable with single quote', async () => {
        assert.deepEqual(
            utils.getNormalizedString(
                "For {0}. This is a great deal, but this price won''t last.",
                [ java.MFQuotesDecoder, java.escapesDecoder, normalizers.bracePHDecoder, xml.entityDecoder ]
            ),
            [
                "For ",
                {"t": "x", "v": "{0}"},
                ". This is a great deal, but this price won't last."
            ]
        );
    });

});
