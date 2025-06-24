import JSZip from 'jszip';
import puppeteer from 'puppeteer';
import { logInfo, logVerbose } from '@l10nmonster/core';

// --- Function to be evaluated in browser context ---
async function extractTextAndMetadataInPageContext() {
    function fe00RangeToUtf8_browser(encoded) {
        const encodingOffset = 0xfe00;
        const decoder = new TextDecoder();
        const length = encoded.length;
        if (length % 2 !== 0) throw new Error('Invalid fe00 encoded input length');
        const bytes = new Uint8Array(length / 2);
        let byteIndex = 0;
        for (let i = 0; i < length; i += 2) {
            const highNibble = encoded.charCodeAt(i) - encodingOffset;
            const lowNibble = encoded.charCodeAt(i + 1) - encodingOffset;
            if (highNibble < 0 || highNibble > 15 || lowNibble < 0 || lowNibble > 15) {
                throw new Error('Invalid char code in fe00 encoded input');
            }
            bytes[byteIndex++] = (highNibble << 4) | lowNibble;
        }
        return decoder.decode(bytes);
    }

    const textElements = [];
    const START_MARKER_REGEX = /(?<![''<])\u200B([\uFE00-\uFE0F]+)/g;
    const END_MARKER = '\u200B';

    if (!document.body) {
        return { error: 'Document body not found.' };
    }

    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    
    let activeSegment = null;
    let node;

    while (node = treeWalker.nextNode()) {
        const parentElement = node.parentElement;
        if (parentElement) {
            const styles = window.getComputedStyle(parentElement);
            if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) === 0) continue;
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'HEAD'].includes(parentElement.tagName)) continue;
        } else {
            continue;
        }

        let searchPos = 0;
        const text = node.nodeValue;

        while (searchPos < text.length) {
            if (activeSegment) {
                const endMarkerPos = text.indexOf(END_MARKER, searchPos);

                if (endMarkerPos !== -1) {
                    activeSegment.text += text.substring(searchPos, endMarkerPos);
                    
                    const range = document.createRange();
                    range.setStart(activeSegment.startNode, activeSegment.startOffset);
                    range.setEnd(node, endMarkerPos);
                    
                    const rect = range.getBoundingClientRect();
                    if (rect.width > 0 || rect.height > 0) {
                        let parsedMetadata = {};
                        try {
                            const decodedJsonMetadata = fe00RangeToUtf8_browser(activeSegment.encodedMetadata);
                            if (decodedJsonMetadata && decodedJsonMetadata.trim() !== '') {
                                 parsedMetadata = JSON.parse(decodedJsonMetadata);
                            }
                        } catch (e) { parsedMetadata.decodingError = e.message; }

                        textElements.push({
                            text: activeSegment.text,
                            x: rect.left + window.scrollX,
                            y: rect.top + window.scrollY,
                            width: rect.width,
                            height: rect.height,
                            ...parsedMetadata
                        });
                    }
                    
                    searchPos = endMarkerPos + 1;
                    activeSegment = null;
                } else {
                    activeSegment.text += text.substring(searchPos);
                    break; 
                }
            } else {
                START_MARKER_REGEX.lastIndex = searchPos;
                const match = START_MARKER_REGEX.exec(text);

                if (match) {
                    const textAfterStart = text.substring(match.index + match[0].length);
                    const endMarkerPosInSubstring = textAfterStart.indexOf(END_MARKER);

                    if (endMarkerPosInSubstring !== -1) {
                        const capturedText = textAfterStart.substring(0, endMarkerPosInSubstring);
                        
                        const range = document.createRange();
                        range.setStart(node, match.index);
                        const endOffset = match.index + match[0].length + endMarkerPosInSubstring;
                        range.setEnd(node, endOffset);

                        const rect = range.getBoundingClientRect();
                        if (rect.width > 0 || rect.height > 0) {
                            let parsedMetadata = {};
                            try {
                                const decodedJsonMetadata = fe00RangeToUtf8_browser(match[1]);
                                if (decodedJsonMetadata && decodedJsonMetadata.trim() !== '') {
                                     parsedMetadata = JSON.parse(decodedJsonMetadata);
                                }
                            } catch (e) { parsedMetadata.decodingError = e.message; }
    
                            textElements.push({
                                text: capturedText,
                                x: rect.left + window.scrollX,
                                y: rect.top + window.scrollY,
                                width: rect.width,
                                height: rect.height,
                                ...parsedMetadata
                            });
                        }
                        searchPos = endOffset + 1;
                    } else {
                        activeSegment = {
                            startNode: node,
                            startOffset: match.index,
                            encodedMetadata: match[1],
                            text: textAfterStart
                        };
                        break;
                    }
                } else {
                    break;
                }
            }
        }
    }
    return { textElements };
}

export class FlowSnapshotter {
    constructor(startUrl, flowNameBase, options = {}) {
        this.browser = null;
        this.startUrl = startUrl;
        this.flowNameBase = flowNameBase;
        this.headless = options.headless ?? false;
    }

    async startFlow() {
        this.browser = await puppeteer.launch({ headless: this.headless, defaultViewport: null });
        this.pageCounter = 0;
        this.capturedPagesData = [];
        this.page = await this.browser.newPage();
        await this.page.goto(this.startUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    async capturePage() {
        if (!this.browser) {
            throw new Error('Browser not started. Call startFlow first.');
        }

        await this.page.bringToFront();

        const screenshotBuffer = await this.page.screenshot({
            fullPage: true,
            type: 'png'
        });

        const currentPageUrl = this.page.url();
        const textDataResult = await this.page.evaluate(extractTextAndMetadataInPageContext);
        if (textDataResult.error) {
            throw new Error(`Error extracting text data: ${textDataResult.error}`);
        } else if (!textDataResult.textElements || textDataResult.textElements.length === 0) {
            logInfo`No LQA metadata segments found on page ${currentPageUrl}`;
        }
        logVerbose`Page ${this.pageCounter} captured: ${currentPageUrl}`;
        const capturedData = {
            url: currentPageUrl,
            timestamp: new Date().toISOString(),
            screenshotBuffer,
            text_content: textDataResult.textElements || [],
            id: `page_${Date.now()}_${this.pageCounter++}`,
        };
        this.capturedPagesData.push(capturedData);
        return capturedData;
    }

    async endFlow() {
        if (this.browser) {
            await this.browser.close();
            logVerbose`Browser closed.`;
            this.browser = null;
            this.page = null;
        }
        if (this.capturedPagesData.length === 0) {
            return null;
        }
        logVerbose`Total pages in flow: ${this.capturedPagesData.length}`;
        const zip = new JSZip();
        const flowMetadata = {
            flowName: this.flowNameBase,
            createdAt: new Date().toISOString(),
            pages: []
        };
        this.capturedPagesData.forEach((pData, index) => {
            const imageName = `page_${index + 1}_${pData.id}.png`;
            zip.file(imageName, pData.screenshotBuffer);
            flowMetadata.pages.push({
                pageId: pData.id,
                originalUrl: pData.url,
                timestamp: pData.timestamp,
                imageFile: imageName,
                segments: pData.text_content
            });
        });
        zip.file('flow_metadata.json', JSON.stringify(flowMetadata, null, 2));
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        return buffer;
    }
}
