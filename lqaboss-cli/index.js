import fs from 'fs';
import JSZip from 'jszip';
import { consoleLog } from '@l10nmonster/core';
import { runCapture } from './capture.js';

export class lqaboss {
    static help = {
        description: 'create an lqaboss flow.',
        arguments: [
            [ '<url>', 'the url of the page to capture' ],
            [ '<flowName>', 'the name of the flow' ],
        ],
    };

    static async action(mm, options) {
        const capturedPagesData = await runCapture(options.url, options.flowName);
        if (capturedPagesData.length === 0) {
            consoleLog`No pages were captured. Nothing to save.`;
        } else {
            consoleLog`Saving flow with ${capturedPagesData.length} page(s)...`;
            const zip = new JSZip();
            const flowMetadata = {
                flowName: options.flowName,
                createdAt: new Date().toISOString(),
                pages: []
            };

            capturedPagesData.forEach((pData, index) => {
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

            zip.file("flow_metadata.json", JSON.stringify(flowMetadata, null, 2));

            const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
            const filename = `${options.flowName.replace(/[^a-z0-9_.-]/gi, '_')}.lqaboss`;
            await fs.promises.writeFile(filename, buffer);
            consoleLog`Flow successfully saved as ${filename}`;
        }
    }
}
