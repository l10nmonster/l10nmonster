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
        assert.equal(result.segments.length, 22);
        assert.equal(result.segments[0].str, 'The World Wide Web project');
        assert.match(result.segments[3].str, /Everything there is online about W3.*<a.*>executive summary<\/a>/);
        assert.match(result.segments[5].str, /Pointers to the world's online information.*<a.*>W3 servers<\/a>/);
        assert.match(result.segments[18].str, /<a.*>How can I help<\/a> ?/);
    });
});

suite('mrmrs.html file tests', () => {
    const resourceFilter = new HTMLFilter();
    const resourceId = 'tests/artifacts/mrmrs.html';

    test('can parse mrmrs.html', async () => {
        const resource = fs.readFileSync(resourceId, 'utf8');
        const result = await resourceFilter.parseResource({ resource });
        
        
        // Basic validation
        assert.ok(result.segments.length > 0, 'Should extract some segments');
        
        // Check that we have the main sections
        const segmentStrings = result.segments.map(s => s.str);
        const hasHeadings = segmentStrings.some(str => str.includes('HTML') || str.includes('Headings'));
        assert.ok(hasHeadings, 'Should contain heading content');
    });

    test('radio button labels are parsed correctly', async () => {
        const resource = fs.readFileSync(resourceId, 'utf8');
        const result = await resourceFilter.parseResource({ resource });
        
        // Check that Label 1 appears correctly and not duplicated
        const label1Segments = result.segments.filter(segment => segment.str.includes('Label 1'));
        
        // Verify the structure is correct
        if (label1Segments.length > 0) {
            const label1Content = label1Segments[0].str;
            // Check for duplicate label tags
            const labelCount = (label1Content.match(/<label>/g) || []).length;
            const closingLabelCount = (label1Content.match(/<\/label>/g) || []).length;
            
            assert.equal(labelCount, closingLabelCount, 'Opening and closing label tags should match');
            
            // Check if there are nested labels (which would be incorrect)
            const hasNestedLabels = label1Content.includes('<label><label>') || 
                                  label1Content.includes('</label></label>');
            assert.ok(!hasNestedLabels, 'Should not have nested label tags');
        }
    });

    test('form elements are parsed correctly', async () => {
        const resource = fs.readFileSync(resourceId, 'utf8');
        const result = await resourceFilter.parseResource({ resource });
        
        // Find segments containing form elements
        const formSegments = result.segments.filter(segment => segment.str.includes('input') || 
            segment.str.includes('Legend Example') ||
            segment.str.includes('Text Input Label') ||
            segment.str.includes('Radio Buttons'));
        
        
        assert.ok(formSegments.length > 0, 'Should find form-related content');
    });

    test('translation of mrmrs.html preserves structure', async () => {
        const resource = fs.readFileSync(resourceId, 'utf8');
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        
        // Check that the translated result is valid HTML
        assert.ok(translatedRes.includes('<!DOCTYPE html>'), 'Should preserve DOCTYPE');
        assert.ok(translatedRes.includes('<html'), 'Should preserve html tag');
        assert.ok(translatedRes.includes('</html>'), 'Should preserve closing html tag');
        
        // Check that radio button structure is preserved
        assert.ok(translatedRes.includes('type="radio"'), 'Should preserve radio input type');
        
        // Check for label structure - should not have duplicated labels
        const labelMatches = translatedRes.match(/<label><label>/g);
        assert.ok(!labelMatches || labelMatches.length === 0, 'Should not have nested label tags');
        
    });

    test('isolated radio button HTML structure issue', async () => {
        // Test the specific problematic HTML structure
        const resource = `
        <div>
            <label>Radio Buttons</label>
            <ul>
                <li><label><input type="radio"/> Label 1</label></li>
                <li><label><input type="radio"/> Label 2</label></li>
            </ul>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        
        // Check for nested labels
        const nestedLabels = translatedRes.match(/<label[^>]*><[^>]*><label/g);
        assert.ok(!nestedLabels || nestedLabels.length === 0, 'Should not create nested label tags');
        
        // Verify that the radio button content is properly extracted without the outer label tags
        const radioSegments = result.segments.filter(segment => segment.str.includes('type="radio"'));
        assert.ok(radioSegments.length > 0, 'Should find radio button segments');
        
        // The segment should contain the input and text, but not the outer label tags
        const labelSegment = radioSegments.find(segment => segment.str.includes('Label 1'));
        assert.ok(labelSegment, 'Should find Label 1 segment');
        assert.ok(!labelSegment.str.startsWith('<label>'), 'Segment should not start with <label> tag');
        assert.ok(!labelSegment.str.endsWith('</label>'), 'Segment should not end with </label> tag');
    });

    test('simple radio button label structure', async () => {
        // Simple test case for radio button label
        const resource = `<label><input type="radio"/> Label 1</label>`;
        
        const result = await resourceFilter.parseResource({ resource });
        
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        
        // This should not have nested labels
        const hasNestedLabels = translatedRes.includes('<label><label>') || translatedRes.includes('</label></label>');
        assert.ok(!hasNestedLabels, 'Should not have nested labels even in simple case');
        
        // Verify the segment content
        assert.equal(result.segments.length, 1, 'Should have exactly one segment');
        const segment = result.segments[0];
        assert.ok(segment.str.includes('type="radio"'), 'Segment should contain radio input');
        assert.ok(segment.str.includes('Label 1'), 'Segment should contain label text');
        assert.ok(!segment.str.startsWith('<label>'), 'Segment should not include outer label tags');
        
        // Verify the translation preserves structure correctly
        assert.ok(translatedRes.startsWith('<label>'), 'Translation should start with label');
        assert.ok(translatedRes.endsWith('</label>'), 'Translation should end with label');
        assert.ok(translatedRes.includes('***'), 'Translation should contain translation markers');
    });

    test('do-not-translate tags are properly excluded', async () => {
        // Test that content inside DNT tags is not translated, even when nested
        const resource = `
        <div>
            <p>This should be translated</p>
            <samp>
                <pre>sudo ipfw pipe 1 config bw 256KByte/s</pre>
            </samp>
            <p>This should also be translated</p>
        </div>`;
        
        const result = await resourceFilter.parseResource({ resource });
        
        // Verify that DNT content is not in any segments
        const dntContentInSegments = result.segments.some(segment => segment.str.includes('sudo ipfw pipe'));
        
        assert.ok(!dntContentInSegments, 'DNT content should not appear in any segments');
        
        // Should have segments for the translatable paragraphs
        const hasTranslatableParagraphs = result.segments.some(segment => segment.str.includes('This should be translated'));
        assert.ok(hasTranslatableParagraphs, 'Should have translatable paragraph content');
        
        // Should have exactly 2 segments (the two paragraphs)
        assert.equal(result.segments.length, 2, 'Should have exactly 2 segments');
        
        const translatedRes = await resourceFilter.translateResource({ resource, translator });
        
        // Verify DNT content is preserved untranslated
        assert.ok(translatedRes.includes('sudo ipfw pipe'), 'DNT content should be preserved');
        
        // Verify DNT content is not wrapped with translation markers
        assert.ok(!translatedRes.includes('***sudo ipfw'), 'DNT content should not have translation markers');
        
        // Verify translatable content is translated
        assert.ok(translatedRes.includes('***This should be translated***'), 'Translatable content should be translated');
        assert.ok(translatedRes.includes('***This should also be translated***'), 'Second translatable content should be translated');
    });
});
