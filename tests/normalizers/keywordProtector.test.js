import KeywordProtector from '../../src/normalizers/keywordProtector';

describe('Keyword Protector tests', () => {

    const kp = new KeywordProtector([ 'Hopper', 'Price Freeze' ], {Hopper: {ja: 'ホッペー', ko: '홉 따는 사람'}}); 

    test('keyword with mapped values', async() => {

        expect(kp.decoder([ { t: "s", v: "Hopper: Flights, Hotels & Cars"} ]))
            .toMatchObject([ { t: "x", v: "protector:Hopper"}, { t: "s",  v: ": Flights, Hotels & Cars" } ]);

        expect(kp.defaultEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/Hopper/);

        expect(kp.mappedEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/ホッペー/);

        expect(kp.mappedEncoder("protector:Hopper", { targetLang: 'ko', prj: 'l10n-adhoc-requests' }))
            .toMatch(/홉 따는 사람/);

        expect(kp.mappedEncoder("protector:Hopper", { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch(/protector:Hopper/);

    });
    test('keyword without mapped values ', async() => {

        expect(kp.decoder([ { t: "s", v: "Price Freeze Deposit and Savings from the rental car price breakdown Freeze"} ]))
            .toMatchObject([ { t: "x", v: "protector:Price Freeze"}, { t: "s",  v: " Deposit and Savings from the rental car price breakdown Freeze" } ]);

        expect(kp.defaultEncoder("protector:Price Freeze", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/Price Freeze/);

        expect(kp.mappedEncoder("protector:Price Freeze", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/protector:Price Freeze/);

        expect(kp.mappedEncoder("protector:Price Freeze", { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch(/protector:Price Freeze/);

    });    

});
