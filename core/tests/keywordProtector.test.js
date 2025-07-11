import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizers } from '../index.js';

suite('Keyword Translator tests - targetLang', () => {

    const [ decoder, encoder ] = normalizers.keywordTranslatorMaker('kw', {Targaryen: {ja: 'ホッペー', ko: '홉 따는 사람'}, 'Price Slash': {}});

    test('Keyword with mapped values', () => {

        assert.deepEqual(
            decoder([ { t: 's', v: 'Targaryen: Travel Options'} ]),
            [ { t: 'x', v: 'kw:Targaryen', s: 'Targaryen' }, { t: 's', v: ': Travel Options' } ]
        );

        assert.equal(encoder('kw:Targaryen', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }), 'ホッペー');

        assert.equal(encoder('kw:Targaryen', { targetLang: 'ko', prj: 'l10n-adhoc-requests' }), '홉 따는 사람');

        assert.equal(encoder('kw:Targaryen', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }), 'Targaryen');

    });

    test('Keyword without mapped values', () => {

        assert.deepEqual(
            decoder([ { t: 's', v: 'Price Slash Deposit and Savings from the rental car price breakdown Slash'} ]),
            [ { t: 'x', v: 'kw:Price Slash', s: 'Price Slash'}, { t: 's', v: ' Deposit and Savings from the rental car price breakdown Slash' } ]
        );

        assert.equal(encoder('kw:Price Slash', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }), 'Price Slash');

        assert.equal(encoder('kw:Price Slash', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }), 'Price Slash');

    });

});

suite('Keyword Translator tests - prj', () => {

    const [ decoder, encoder ] = normalizers.keywordTranslatorMaker('kw', {Targaryen: {'l10n-adhoc-requests': 'product1', 'other-repo': 'product2'}, 'Price Slash': {}});

    test('keyword with mapped values', () => {

        assert.deepEqual(
            decoder([ { t: 's', v: 'Targaryen: Travel Options'} ]),
            [ { t: 'x', v: 'kw:Targaryen', s: 'Targaryen'}, { t: 's', v: ': Travel Options' } ]
        );

        assert.equal(encoder('kw:Targaryen', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }), 'product1');

        assert.equal(encoder('kw:Targaryen', { targetLang: 'ko', prj: 'other-repo' }), 'product2');

        assert.equal(encoder('kw:Targaryen', { targetLang: 'da-DK', prj: 'another-repo' }), 'Targaryen');

    });

    test('Keyword without mapped values', () => {

        assert.deepEqual(
            decoder([ { t: 's', v: 'Price Slash Deposit and Savings from the rental car price breakdown Slash'} ]),
            [ { t: 'x', v: 'kw:Price Slash', s: 'Price Slash'}, { t: 's', v: ' Deposit and Savings from the rental car price breakdown Slash' } ]
        );

        assert.equal(encoder('kw:Price Slash', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }), 'Price Slash');

        assert.equal(encoder('kw:Price Slash', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }), 'Price Slash');

    });
});

suite('Keyword Translator tests - conflicting kw', () => {

    // eslint-disable-next-line no-unused-vars
    const [ decoder, encoder ] = normalizers.keywordTranslatorMaker('kw', {Targaryen: {}, 'House Targaryen': {}, House: {}});

    test('keyword without mapped values', () => {

        assert.deepEqual(
            decoder([ { t: 's', v: 'Targaryen: Travel Options'} ]),
            [ { t: 'x', v: 'kw:Targaryen', s: 'Targaryen'}, { t: 's', v: ': Travel Options' } ]
        );

        assert.deepEqual(
            decoder([ { t: 's', v: 'House Targaryen: Travel Options'} ]),
            [ { t: 'x', v: 'kw:House Targaryen', s: 'House Targaryen'}, { t: 's', v: ': Travel Options' } ]
        );

    });
});

suite('Keyword Translator tests', () => {

    test('No key map', () => {
        assert.throws(normalizers.keywordTranslatorMaker);
    });

    test('Empty key map', () => {
        assert.throws(() => normalizers.keywordTranslatorMaker('foo', {}));
    });
});
