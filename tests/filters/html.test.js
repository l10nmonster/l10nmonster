import * as html from '../../src/filters/html';
import { getNormalizedString } from '../../src/normalizers/util.js';
import { xmlDecoder /* , xmlEntityDecoder */ } from '../../src/normalizers/regex.js';
import { readFileSync } from 'fs';

const translator = async function translate(sid, str) {
  return `***${str}***`;
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
                        sid: 'EWFCVWRUZoI4ECU1nE2PdXEq_RSvrn_YW5HGjrLwP4Q',
                        str: '<h1>Winter is 🎉</h1>  <div> <div class="body-paragraph">coming</div> </div> <a href="#" id="redeemButton" class="button white w-button">Redeem Gift</a>'
                      }
                    ]
            });

            const out = getNormalizedString(pageRes.segments[0].str, [xmlDecoder]);
            expect(out)
                .toMatchObject ([
                    {"t": "bx", "v": "<h1>"},
                    "Winter is 🎉",
                    {"t": "ex", "v": "</h1>"},
                    "  ",
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
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        expect(translatedRes).toBe("<!DOCTYPE html><!-- Last Published: Tue Oct 04 2022 16:40:09 GMT+0000 (Coordinated Universal Time) --><html><head></head>\n    <body class=\"bodyvoucher\">\n        <div class=\"container-2\">***<h1>Winter is 🎉</h1>  <div> <div class=\"body-paragraph\">coming</div> </div> <a href=\"#\" id=\"redeemButton\" class=\"button white w-button\">Redeem Gift</a>***</div>\n    \n\n</body></html>");
    });
});

describe('html filter fragment tests', () => {
    const resourceFilter = new html.HTMLFilter();
    test('translateResource for a text fragment returns string', async () => {
        const resource = 'Hello world';
        const expectedOutput = '***Hello world***';
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        expect(translatedRes).toBe(expectedOutput);
    });
    test('translateResource for a text fragment with markup returns string', async () => {
        const resource = 'Hello <b>world</b>';
        const expectedOutput = '***Hello <b>world</b>***';
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        expect(translatedRes).toBe(expectedOutput);
    });
    test('translateResource for a full html returns string', async () => {
      const resource = '<html><head></head><body>Hello world</body></html>';
      const expectedOutput = '<html><head></head><body>***Hello world***</body></html>';
      const translatedRes = await resourceFilter.translateResource({ resource, translator });
      expect(translatedRes).toBe(expectedOutput);
    });
});
