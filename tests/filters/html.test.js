import * as html from '../../src/filters/html';
import { getNormalizedString } from '../../src/normalizers/util.js';
import { xmlDecoder /* , xmlEntityDecoder */ } from '../../src/normalizers/regex.js';
import { readFileSync } from 'fs';

const translator = async function translate(sid, str) {
  return sid === 'str1' ? undefined : `***${str}***`;
}

describe('html filter tests', () => {
    const resourceFilter = new html.HTMLFilter();
    const resourceId = 'tests/files/values/page.html';

    test('html normalizers work as expected', async () => {
        const page = readFileSync(resourceId, 'utf8');
        const pageRes = await resourceFilter.parseResource({resource: page});
        expect(pageRes)
            .toMatchObject({
                    segments: [
                      {
                        sid: '_7-rxUyoom72VOHf7M6YAtljJoaRmfSx26wK2x_n3gY',
                        str: 'coming'
                      },
                      {
                        sid: 'P9vq1R3XnX7Fy2UZ-nadhNNa5PiFG4DIxs5QvyT2wKA',
                        str: '<h1>Winter is 🎉</h1> <div> <div class="body-paragraph">coming</div> </div> <a href="#" id="redeemButton" class="button white w-button">Redeem Gift</a>'
                      }
                    ]
            });

            const out = getNormalizedString(pageRes.segments[1].str, [xmlDecoder]);
            expect(out)
                .toMatchObject ([
                    {"t": "bx", "v": "<h1>"},
                    "Winter is 🎉",
                    {"t": "ex", "v": "</h1>"},
                    " ",
                    {"t": "bx", "v": "<div>"},
                    " ",
                    {"t": "bx", "v": "<div class=\"body-paragraph\">"},
                    "coming",
                    {"t": "ex", "v": "</div>"},
                    " ",
                    {"t": "ex", "v": "</div>"},
                    " ",
                    {"t": "bx", "v": "<a href=\"#\" id=\"redeemButton\" class=\"button white w-button\">"},
                    "Redeem Gift",
                    {"t": "ex", "v": "</a>",}
                ]);
    });

    test('translateResource returns string', async () => {
        const resource = readFileSync(resourceId, 'utf8');
        const expectedOutput = readFileSync('tests/files/values-fil/page.html', 'utf8');
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        expect(translatedRes).toBe(expectedOutput);
    });
});

describe('html filter fragment tests', () => {
    const resourceFilter = new html.HTMLFilter();
    test('translateResource for a text fragmentreturns string', async () => {
        const resource = 'Hello world';
        const expectedOutput = '***Hello world***';
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        expect(translatedRes).toBe(expectedOutput);
    });
    test('translateResource for a text fragmentreturns string', async () => {
      const resource = '<html><head></head><body>Hello world</body></html>';
      const expectedOutput = '<html><head></head><body>***Hello world***</body></html>';
      const translatedRes = await resourceFilter.translateResource({ resource, translator });
      expect(translatedRes).toBe(expectedOutput);
    });
});
