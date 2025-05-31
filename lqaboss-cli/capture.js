import puppeteer from 'puppeteer';
import readline from 'readline';
import { consoleLog } from '@l10nmonster/core';

// --- Function to be evaluated in browser context ---
async function extractTextAndMetadataInPageContextForCLI() {
    function fe00RangeToUtf8_browser(encoded) {
        const encodingOffset = 0xfe00;
        const decoder = new TextDecoder();
        const length = encoded.length;
        if (length % 2 !== 0) throw new Error("Invalid fe00 encoded input length");
        const bytes = new Uint8Array(length / 2);
        let byteIndex = 0;
        for (let i = 0; i < length; i += 2) {
            const highNibble = encoded.charCodeAt(i) - encodingOffset;
            const lowNibble = encoded.charCodeAt(i + 1) - encodingOffset;
            if (highNibble < 0 || highNibble > 15 || lowNibble < 0 || lowNibble > 15) {
                throw new Error("Invalid char code in fe00 encoded input");
            }
            bytes[byteIndex++] = (highNibble << 4) | lowNibble;
        }
        return decoder.decode(bytes);
    }

    const textElements = [];
    const TARGET_REGEX = /(?<!["'<])\u200B([\uFE00-\uFE0F]+)([^\u200B]*?)\u200B(?![^<>]*">)/g;
    if (!document.body) return { error: "Document body not found." };

    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while (node = treeWalker.nextNode()) {
        const parentElement = node.parentElement;
        if (parentElement) {
            const styles = window.getComputedStyle(parentElement);
            if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) === 0) continue;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'HEAD'].includes(parentElement.tagName)) continue;
        } else { continue; }

        const nodeTextContent = node.nodeValue;
        let match;
        TARGET_REGEX.lastIndex = 0;
        while ((match = TARGET_REGEX.exec(nodeTextContent)) !== null) {
            const encodedMetadata = match[1];
            const capturedText = match[2];
            let parsedMetadata = {};
            try {
                const decodedJsonMetadata = fe00RangeToUtf8_browser(encodedMetadata);
                if (decodedJsonMetadata && decodedJsonMetadata.trim() !== "") {
                     parsedMetadata = JSON.parse(decodedJsonMetadata);
                }
            } catch (e) { parsedMetadata.decodingError = e.message; }

            const range = document.createRange();
            try {
                range.setStart(node, match.index);
                range.setEnd(node, match.index + match[0].length);
                const rect = range.getBoundingClientRect();
                if (rect.width > 0 || rect.height > 0) {
                    textElements.push({
                        text: capturedText,
                        x: rect.left + window.scrollX,
                        y: rect.top + window.scrollY,
                        width: rect.width,
                        height: rect.height,
                        ...parsedMetadata
                    });
                }
            } catch (rangeError) { /* console.warn in browser */ }
        }
    }
    return { textElements };
}


export async function runCapture(startUrl, flowNameBase) {
    const capturedPagesData = [];
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, defaultViewport: null });
        const page = await browser.newPage();

        consoleLog`Navigating to ${startUrl}...`;
        await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        consoleLog`Page loaded: ${page.url()}`;
        consoleLog`----------------------------------------------------`;
        consoleLog` LQA Boss CLI Capture Mode`;
        consoleLog`----------------------------------------------------`;
        consoleLog` - Interact with the opened Chrome window to navigate.`;
        consoleLog` - Return to this terminal to issue commands.`;
        consoleLog` - Press ENTER to capture the current page.`;
        consoleLog` - Type 'q' then ENTER to finish and save the flow.`;
        consoleLog`----------------------------------------------------`;

        let pageCounter = 0;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> ' // Optional: show a prompt character
        });

        const question = (query) => new Promise(resolve => rl.question(query, resolve));

        rl.on('close', () => {
            consoleLog`Input stream closed.`;
        });

        while (true) {
            const answer = await question('Press ENTER to capture, or type "q" then ENTER to quit: ');

            if (answer.toLowerCase().trim() === 'q') {
                consoleLog`Quit command received.`;
                break; // Exit the loop to proceed to saving
            }

            // Any input that is just ENTER (empty string after trim) or anything not 'q'
            // will be treated as a capture command.
            // We can be more explicit if needed, but empty string for ENTER is common.
            if (answer.trim() === '' || answer.toLowerCase().trim() !== 'q') {
                if (answer.trim() !== '') {
                    consoleLog`Input "${answer.trim()}" received, treating as CAPTURE command.`;
                } else {
                    consoleLog`ENTER key received, treating as CAPTURE command.`;
                }

                consoleLog`Capturing current page...`;
                try {
                    await page.bringToFront();

                    const screenshotBuffer = await page.screenshot({
                        fullPage: true,
                        type: 'png'
                    });

                    const textDataResult = await page.evaluate(extractTextAndMetadataInPageContextForCLI);
                    if (textDataResult.error) {
                        console.error("! Error extracting text data:", textDataResult.error);
                    } else if (!textDataResult.textElements || textDataResult.textElements.length === 0) {
                        console.warn("! No LQA metadata segments found on this page. Page will be saved without segments.");
                    }

                    const currentPageUrl = page.url();
                    capturedPagesData.push({
                        id: `page_${Date.now()}_${pageCounter++}`,
                        url: currentPageUrl,
                        timestamp: new Date().toISOString(),
                        screenshotBuffer,
                        text_content: textDataResult.textElements || []
                    });
                    consoleLog`  Page ${pageCounter} captured: ${currentPageUrl}`;
                    consoleLog`  Total pages in flow: ${capturedPagesData.length}`;

                } catch (err) {
                    console.error("! Error during capture:", err.message);
                }
            }
            // No 'else' needed here as we only break on 'q' or proceed with capture.
        }

        rl.close(); // Close readline before saving
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) {
            await browser.close();
            consoleLog`Browser closed.`;
        }
    }
    return capturedPagesData;
}
