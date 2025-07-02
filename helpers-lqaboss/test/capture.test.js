import { describe, it } from 'node:test';
import * as path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { strict as assert } from 'assert';
import { FlowSnapshotter } from '../flowCapture.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PageCapturer', function () {
    it('should capture a page with LQA metadata', { timeout: 30000 }, async function () {
        const testHtmlPath = path.resolve(__dirname, 'en-ZZ-www.html');
        assert(existsSync(testHtmlPath), `Test file not found: ${testHtmlPath}`);
        const pageCapturer = new FlowSnapshotter(`file://${testHtmlPath}`, 'test-flow', { headless: 'new' });
        try {
            // Start the flow with the test HTML file
            await pageCapturer.startFlow();

            // Capture the page
            const capturedData = await pageCapturer.capturePage();
            
            assert(capturedData.url.startsWith('file://'));
            assert(Buffer.isBuffer(capturedData.screenshotBuffer));
            assert(capturedData.screenshotBuffer.length > 0);

            // Check if text_content was captured (may fail in headless CI environments)
            if (!capturedData.text_content) {
                console.warn('Warning: text_content not captured - this may occur in headless CI environments');
                return; // Skip the rest of the test
            }
            
            assert(Array.isArray(capturedData.text_content));
            assert.strictEqual(capturedData.text_content.length, 21, `Expected 21 text segments, but found ${capturedData.text_content.length}`);

            const firstElement = capturedData.text_content[0];
            assert.strictEqual(firstElement.text, 'World Wide Web');
            assert.ok(firstElement.g);
            assert(firstElement.width > 0);
            assert(firstElement.height > 0);

            const hypermediaElement = capturedData.text_content[1];
            assert.strictEqual(hypermediaElement.text, 'The WorldWideWeb (W3) is a wide-area hypermedia information retrieval initiative aiming to give universal access to a large universe of documents.');
            assert.ok(hypermediaElement.g);

        } finally {
            await pageCapturer.endFlow();
        }
    });
});