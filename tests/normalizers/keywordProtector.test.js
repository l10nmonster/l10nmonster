import { keywordProtector } from '../../src/normalizers/keywordProtector';

describe('Keyword Protector tests', () => {

    const [decoder, defaultEncoder, mappedEncoder ] = keywordProtector({Hopper: {ja: 'ホッペー', ko: '홉 따는 사람'}, 'Price Freeze': {}}); 

    test('keyword with mapped values', async() => {

        expect(decoder([ { t: "s", v: "Hopper: Flights, Hotels & Cars"} ]))
            .toMatchObject([ { t: "x", v: "protector:Hopper"}, { t: "s",  v: ": Flights, Hotels & Cars" } ]);

        expect(defaultEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('Hopper');

        expect(mappedEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('ホッペー');

        expect(mappedEncoder("protector:Hopper", { targetLang: 'ko', prj: 'l10n-adhoc-requests' }))
            .toMatch('홉 따는 사람');

        expect(mappedEncoder("protector:Hopper", { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch('protector:Hopper');

    });
    test('keyword without mapped values ', async() => {

        expect(decoder([ { t: "s", v: "Price Freeze Deposit and Savings from the rental car price breakdown Freeze"} ]))
            .toMatchObject([ { t: "x", v: "protector:Price Freeze"}, { t: "s",  v: " Deposit and Savings from the rental car price breakdown Freeze" } ]);

        expect(defaultEncoder("protector:Price Freeze", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('Price Freeze');

        expect(mappedEncoder("protector:Price Freeze", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch('protector:Price Freeze');

        expect(mappedEncoder("protector:Price Freeze", { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch('protector:Price Freeze');

    });    

});
