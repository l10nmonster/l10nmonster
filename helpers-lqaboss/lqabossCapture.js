import fs from 'fs';
import readline from 'readline';
import { consoleLog } from '@l10nmonster/core';
import { FlowSnapshotter } from './flowCapture.js';

export class lqaboss_capture {
    static help = {
        description: 'create an lqaboss flow.',
        arguments: [
            ['<url>', 'the url of the page to capture'],
            ['<flowName>', 'the name of the flow'],
        ],
        options: [
            [ '--lang <srcLang,tgtLang>', 'source and target language pair' ],
        ],
    };

    static async action(mm, options) {
        if (!options.url || !options.flowName) {
            throw new Error('You must specify a url and a flowName');
        }
        const langPairs = options.lang ? (Array.isArray(options.lang) ? options.lang : options.lang.split(',')) : null;
        let tm;
        if (langPairs) {
            const [ sourceLang, targetLang ] = langPairs;
            tm = mm.tmm.getTM(sourceLang, targetLang);
        }
        // Run the capture flow
        const lqaBossBuffer = await runCapture(options.url, options.flowName, tm);
        if (lqaBossBuffer) {
            const filename = `${options.flowName.replace(/[^a-z0-9_.-]/gi, '_')}.lqaboss`;
            await fs.promises.writeFile(filename, lqaBossBuffer);
            consoleLog`Flow successfully saved as ${filename}`;
        } else {
            console.log('No pages were captured. Nothing to save.');
        }
    }
}

async function runCapture(startUrl, flowNameBase, tm) {
    const snapShotter = new FlowSnapshotter(startUrl, flowNameBase);
    try {
        consoleLog`Navigating to ${startUrl}...`;
        await snapShotter.startFlow();
        consoleLog`----------------------------------------------------`;
        consoleLog` LQA Boss CLI Capture Mode`;
        consoleLog`----------------------------------------------------`;
        consoleLog` - Interact with the opened Chrome window to navigate.`;
        consoleLog` - Return to this terminal to issue commands.`;
        consoleLog` - Press ENTER to capture the current page.`;
        consoleLog` - Type 'q' then ENTER to finish and save the flow.`;
        consoleLog`----------------------------------------------------`;
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> ' // Optional: show a prompt character
        });
        const question = (query) => new Promise(resolve => rl.question(query, resolve));
        // rl.on('close', () => {
        //     consoleLog`Input stream closed.`;
        // });

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
                    await snapShotter.capturePage();
                } catch (err) {
                    console.error("! Error during capture:", err.message);
                }
            }
            // No 'else' needed here as we only break on 'q' or proceed with capture.
        }

        rl.close(); // Close readline before saving
    } catch (error) {
        console.error("An error occurred:", error);
        return null;
    }
    return await snapShotter.endFlow(tm);
}
