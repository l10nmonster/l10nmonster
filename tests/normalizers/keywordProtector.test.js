import { keywordTranslatorMaker } from '../../src/normalizers/keywordTranslatorMaker';

describe('Keyword Translator tests - targetLang', () => {

    const [ decoder, encoder ] = keywordTranslatorMaker('kp', {Hopper: {ja: 'ホッペー', ko: '홉 따는 사람'}, 'Price Freeze': {}}); 

    test('keyword with mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Hopper: Flights, Hotels & Cars'} ]))
            .toMatchObject([ { t: 'x', v: 'protector:Hopper'}, { t: 's',  v: ': Flights, Hotels & Cars' } ]);

        expect(encoder('protector:Hopper', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('ホッペー');

        expect(encoder('protector:Hopper', { targetLang: 'ko', prj: 'l10n-adhoc-requests' }))
            .toMatch('홉 따는 사람');

        expect(encoder('protector:Hopper', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch('Hopper');

    });

    test('Keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Price Freeze Deposit and Savings from the rental car price breakdown Freeze'} ]))
            .toMatchObject([ { t: 'x', v: 'protector:Price Freeze'}, { t: 's',  v: ' Deposit and Savings from the rental car price breakdown Freeze' } ]);

        expect(encoder('protector:Price Freeze', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('Price Freeze');

        expect(encoder('protector:Price Freeze', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch('Price Freeze');

    });    
});

describe('Keyword Translator tests - prj', () => {

    const [ decoder, encoder ] = keywordTranslatorMaker('kp', {Hopper: {'l10n-adhoc-requests': 'product1', 'other-repo': 'product2'}, 'Price Freeze': {}}); 

    test('keyword with mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Hopper: Flights, Hotels & Cars'} ]))
            .toMatchObject([ { t: 'x', v: 'protector:Hopper'}, { t: 's',  v: ': Flights, Hotels & Cars' } ]);

        expect(encoder('protector:Hopper', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('product1');

        expect(encoder('protector:Hopper', { targetLang: 'ko', prj: 'other-repo' }))
            .toMatch('product2');

        expect(encoder('protector:Hopper', { targetLang: 'da-DK', prj: 'another-repo' }))
            .toMatch('Hopper');

    });

    test('Keyword without mapped values', async() => {

        expect(decoder([ { t: 's', v: 'Price Freeze Deposit and Savings from the rental car price breakdown Freeze'} ]))
            .toMatchObject([ { t: 'x', v: 'protector:Price Freeze'}, { t: 's',  v: ' Deposit and Savings from the rental car price breakdown Freeze' } ]);

        expect(encoder('protector:Price Freeze', { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('Price Freeze');

        expect(encoder('protector:Price Freeze', { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch('Price Freeze');

    });    
});

describe('Keyword Translator tests', () => {

    test('No key map ', async() => {
        expect( () => {
            keywordTranslatorMaker();
        }).toThrowError('You have to specify a keyword map as in input paramter');
    });    

    test('Empty key map ', async() => {
        expect( () => {
            keywordTranslatorMaker('foo', {});
        }).toThrowError('You have to specify a keyword map as in input paramter');
    });    

});
