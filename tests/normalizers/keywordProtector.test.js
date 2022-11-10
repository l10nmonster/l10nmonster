
import { keywordTranslatorMaker } from '../../src/normalizers/keywordTranslatorMaker';

describe('Keyword Translator tests - targetLang', () => {

    const [ decoder, encoder ] = keywordTranslatorMaker('kw', {Targaryen: {ja: 'ホッペー', ko: '홉 따는 사람'}, 'Price Slash': {}});

    test('Keyword with mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Targaryen: Travel Options'} ]))
            .toStrictEqual([ { t: 'x', v: 'kw:Targaryen', s: 'Targaryen' }, { t: 's', v: ': Travel Options' } ]);

        expect(encoder('kw:Targaryen', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('ホッペー');

        expect(encoder('kw:Targaryen', { targetLang: 'ko', prj: 'l10n-adhoc-requests' }))
            .toEqual('홉 따는 사람');

        expect(encoder('kw:Targaryen', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toEqual('Targaryen');

    });

    test('Keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Price Slash Deposit and Savings from the rental car price breakdown Slash'} ]))
            .toStrictEqual([ { t: 'x', v: 'kw:Price Slash', s: 'Price Slash'}, { t: 's', v: ' Deposit and Savings from the rental car price breakdown Slash' } ]);

        expect(encoder('kw:Price Slash', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Slash');

        expect(encoder('kw:Price Slash', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Slash');

    });

});

describe('Keyword Translator tests - prj', () => {

    const [ decoder, encoder ] = keywordTranslatorMaker('kw', {Targaryen: {'l10n-adhoc-requests': 'product1', 'other-repo': 'product2'}, 'Price Slash': {}});

    test('keyword with mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Targaryen: Travel Options'} ]))
            .toStrictEqual([ { t: 'x', v: 'kw:Targaryen', s: 'Targaryen'}, { t: 's', v: ': Travel Options' } ]);

        expect(encoder('kw:Targaryen', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('product1');

        expect(encoder('kw:Targaryen', { targetLang: 'ko', prj: 'other-repo' }))
            .toEqual('product2');

        expect(encoder('kw:Targaryen', { targetLang: 'da-DK', prj: 'another-repo' }))
            .toEqual('Targaryen');

    });

    test('Keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Price Slash Deposit and Savings from the rental car price breakdown Slash'} ]))
            .toStrictEqual([ { t: 'x', v: 'kw:Price Slash', s: 'Price Slash'}, { t: 's', v: ' Deposit and Savings from the rental car price breakdown Slash' } ]);

        expect(encoder('kw:Price Slash', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Slash');

        expect(encoder('kw:Price Slash', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Slash');

    });
});

describe('Keyword Translator tests - conflicting kw', () => {

    // eslint-disable-next-line no-unused-vars
    const [ decoder, encoder ] = keywordTranslatorMaker('kw', {Targaryen: {}, 'House Targaryen': {}, House: {}});

    test('keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Targaryen: Travel Options'} ]))
            .toStrictEqual([ { t: 'x', v: 'kw:Targaryen', s: 'Targaryen'}, { t: 's', v: ': Travel Options' } ]);

        expect(decoder([ { t: 's', v: 'House Targaryen: Travel Options'} ]))
            .toStrictEqual([ { t: 'x', v: 'kw:House Targaryen', s: 'House Targaryen'}, { t: 's', v: ': Travel Options' } ]);

    });

});

describe('Keyword Translator tests', () => {

    test('No key map', async() => {
        expect(() => {
            keywordTranslatorMaker();
        }).toThrowError('You have to specify a keyword map to keywordTranslatorMaker');
    });

    test('Empty key map', async() => {
        expect(() => {
            keywordTranslatorMaker('foo', {});
        }).toThrowError('You have to specify a keyword map to keywordTranslatorMaker');
    });

});
