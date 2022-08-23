import { keywordTranslatorMaker } from '../../src/normalizers/keywordTranslatorMaker';

describe('Keyword Translator tests - targetLang', () => {

    const [ decoder, encoder ] = keywordTranslatorMaker('kw', {Hopper: {ja: 'ホッペー', ko: '홉 따는 사람'}, 'Price Freeze': {}});

    test('keyword with mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Hopper: Flights, Hotels & Cars'} ]))
            .toMatchObject([ { t: 'x', v: 'kw:Hopper'}, { t: 's', v: ': Flights, Hotels & Cars' } ]);

        expect(encoder('kw:Hopper', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('ホッペー');

        expect(encoder('kw:Hopper', { targetLang: 'ko', prj: 'l10n-adhoc-requests' }))
            .toEqual('홉 따는 사람');

        expect(encoder('kw:Hopper', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toEqual('Hopper');

    });

    test('Keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Price Freeze Deposit and Savings from the rental car price breakdown Freeze'} ]))
            .toMatchObject([ { t: 'x', v: 'kw:Price Freeze'}, { t: 's', v: ' Deposit and Savings from the rental car price breakdown Freeze' } ]);

        expect(encoder('kw:Price Freeze', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Freeze');

        expect(encoder('kw:Price Freeze', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Freeze');

    });
});

describe('Keyword Translator tests - prj', () => {

    const [ decoder, encoder ] = keywordTranslatorMaker('kw', {Hopper: {'l10n-adhoc-requests': 'product1', 'other-repo': 'product2'}, 'Price Freeze': {}});

    test('keyword with mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Hopper: Flights, Hotels & Cars'} ]))
            .toMatchObject([ { t: 'x', v: 'kw:Hopper'}, { t: 's', v: ': Flights, Hotels & Cars' } ]);

        expect(encoder('kw:Hopper', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('product1');

        expect(encoder('kw:Hopper', { targetLang: 'ko', prj: 'other-repo' }))
            .toEqual('product2');

        expect(encoder('kw:Hopper', { targetLang: 'da-DK', prj: 'another-repo' }))
            .toEqual('Hopper');

    });

    test('Keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Price Freeze Deposit and Savings from the rental car price breakdown Freeze'} ]))
            .toMatchObject([ { t: 'x', v: 'kw:Price Freeze'}, { t: 's', v: ' Deposit and Savings from the rental car price breakdown Freeze' } ]);

        expect(encoder('kw:Price Freeze', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Freeze');

        expect(encoder('kw:Price Freeze', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toEqual('Price Freeze');

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
