import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

import { HTMLFilter } from '../index.js';
import { utils, xml } from '@l10nmonster/core';
import fs from 'fs';

const translator = async function translate(sid, str) {
  return `***${str}***`;
}

suite('html filter tests', () => {
    const resourceFilter = new HTMLFilter({ hasInlineBlockElements: true });
    const resourceId = 'tests/artifacts/page.html';

    test('html normalizers work as expected', async () => {
        const page = fs.readFileSync(resourceId, 'utf8');
        const pageRes = await resourceFilter.parseResource({resource: page});
        assert.deepEqual(pageRes, {
                    segments: [
                      {
                        sid: 'P9vq1R3XnX7Fy2UZ-nadhNNa5PiFG4DIxs5QvyT2wKA',
                        str: '<h1>Winter is 🎉</h1> <div> <div class="body-paragraph">coming</div> </div> <a href="#" id="redeemButton" class="button white w-button">Redeem Gift</a>'
                      }
                    ]
            });

            const out = utils.getNormalizedString(pageRes.segments[0].str, [xml.tagDecoder]);
            assert.deepEqual(out, [
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
        const resource = fs.readFileSync(resourceId, 'utf8');
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        assert.equal(translatedRes, `<!DOCTYPE html><!-- Last Published: Tue Oct 04 2022 16:40:09 GMT+0000 (Coordinated Universal Time) --><html><head></head>
    <body class="bodyvoucher">
        <div class="container-2">***<h1>Winter is 🎉</h1> <div> <div class="body-paragraph">coming</div> </div> <a href="#" id="redeemButton" class="button white w-button">Redeem Gift</a>***</div>
    

</body></html>`);
    });
});

suite('html filter fragment tests', () => {
    const resourceFilter = new HTMLFilter({ hasInlineBlockElements: true });
    test('translateResource for a text fragment returns string', async () => {
        const resource = 'Hello world';
        const expectedOutput = '***Hello world***';
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        assert.equal(translatedRes, expectedOutput);
    });
    test('translateResource for a text fragment with markup returns string', async () => {
        const resource = 'Hello <b>world</b>';
        const expectedOutput = '***Hello <b>world</b>***';
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        assert.equal(translatedRes, expectedOutput);
    });
    test('translateResource for a full html returns string', async () => {
      const resource = '<html><head></head><body>Hello world</body></html>';
      const expectedOutput = '<html><head></head><body>***Hello world***</body></html>';
      const translatedRes = await resourceFilter.translateResource({ resource, translator });
      assert.equal(translatedRes, expectedOutput);
    });
});

suite('html filter with hasInlineBlockElements option', () => {
    test('hasInlineBlockElements=true keeps mixed content together', async () => {
        const resourceFilter = new HTMLFilter({ hasInlineBlockElements: true });
        const resource = `<div class="container">
            <h1>First heading</h1>
            <p>First paragraph</p>
            Some loose text
            <p>Second paragraph</p>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        assert.equal(result.segments.length, 1);
        assert.match(result.segments[0].str, /First heading.*First paragraph.*Some loose text.*Second paragraph/s);
    });
    
    test('hasInlineBlockElements=false (default) separates block elements', async () => {
        const resourceFilter = new HTMLFilter();
        const resource = `<div class="container">
            <h1>First heading</h1>
            <p>First paragraph</p>
            <div>Block content</div>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        assert.equal(result.segments.length, 3);
        assert.equal(result.segments[0].str, 'First heading');
        assert.equal(result.segments[1].str, 'First paragraph');
        assert.equal(result.segments[2].str, 'Block content');
    });
    
    test('hasInlineBlockElements=false with mixed block and inline content', async () => {
        const resourceFilter = new HTMLFilter();
        const resource = `<div class="container">
            <h1>First heading</h1>
            <p>First paragraph</p>
            Some loose text with <span>inline elements</span>
            <p>Second paragraph</p>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        assert.equal(result.segments.length, 4);
        assert.equal(result.segments[0].str, 'First heading');
        assert.equal(result.segments[1].str, 'First paragraph');
        assert.match(result.segments[2].str, /Some loose text with.*inline elements/);
        assert.equal(result.segments[3].str, 'Second paragraph');
    });
    
    test('hasInlineBlockElements=false with inline elements after blocks', async () => {
        const resourceFilter = new HTMLFilter();
        const resource = `<div class="container">
            <h1>First heading</h1>
            <p>First paragraph</p>
            <span>Inline text</span>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        assert.equal(result.segments.length, 3);
        assert.equal(result.segments[0].str, 'First heading');
        assert.equal(result.segments[1].str, 'First paragraph');
        assert.match(result.segments[2].str, /Inline text/);
    });
    
    test('hasInlineBlockElements=false with only inline content', async () => {
        const resourceFilter = new HTMLFilter();
        const resource = `<div>
            Some text with <span>inline</span> and <a href="#">link</a>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        assert.equal(result.segments.length, 1);
        assert.match(result.segments[0].str, /Some text with.*inline.*and.*link/s);
    });
    
    test('hasInlineBlockElements=false translation preserves structure', async () => {
        const resourceFilter = new HTMLFilter();
        const resource = `<div>
            <h1>Heading</h1>
            Text content
            <p>Paragraph</p>
        </div>`;
        
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        assert.match(translatedRes, /<h1>\*\*\*Heading\*\*\*<\/h1>/);
        assert.match(translatedRes, /\*\*\*.*Text content.*\*\*\*/);
        assert.match(translatedRes, /<p>\*\*\*Paragraph\*\*\*<\/p>/);
    });

    test('can parse www.html', async () => {
        const resourceFilter = new HTMLFilter();
        const resource = fs.readFileSync('tests/artifacts/www.html', 'utf8');
        const result = await resourceFilter.parseResource({ resource });
        console.dir(result.segments, { depth: null });
        assert.equal(result.segments.length, 22);
        assert.equal(result.segments[0].str, 'The World Wide Web project');
        assert.match(result.segments[3].str, /Everything there is online about W3.*<a.*>executive summary<\/a>/);
        assert.match(result.segments[5].str, /Pointers to the world's online information.*<a.*>W3 servers<\/a>/);
        assert.match(result.segments[18].str, /<a.*>How can I help<\/a> ?/);
    });
});
