import KeywordProtector from '../../src/normalizers/keywordProtector';

describe('Keyword Protector tests', () => {
    test('targetLang matches', async() => {
        const kp = new KeywordProtector([ 'Hopper' ], {'Hopper': {'ja': 'ホッペー'}}); 

        expect(kp.decoder([ { t: "s", v: "Hopper: Flights, Hotels & Cars"} ]))
            .toMatchObject([ { t: "x", v: "protector:Hopper"}, { t: "s",  v: ": Flights, Hotels & Cars" } ]);

        expect(kp.defaultEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/Hopper/);

        expect(kp.mappedEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/ホッペー/);
    });

    test('targetLang doesn\'t match', async() => {
        const kp = new KeywordProtector([ 'Hopper' ], {'Hopper': {'ja': 'ホッペー'}}); 

        expect(kp.decoder([ { t: "s", v: "Hopper: Flights, Hotels & Cars"} ]))
            .toMatchObject([ { t: "x", v: "protector:Hopper"}, { t: "s",  v: ": Flights, Hotels & Cars" } ]);

        expect(kp.defaultEncoder("protector:Hopper", { targetLang: 'ja', prj: 'l10n-adhoc-requests' }))
            .toMatch(/Hopper/);

        expect(kp.mappedEncoder("protector:Hopper", { targetLang: 'da-DK', prj: 'l10n-adhoc-requests' }))
            .toMatch(/protector:Hopper/);
    });

});
