import { flattenNormalizedSourceV1 } from '../normalizers/util.js';

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
export const consoleColor = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bright: '\x1b[1m',
};

export function printTus(tus) {
    const unstranslatedContent = {};
    for (const tu of tus) {
        const prj = tu.prj || 'default';
        unstranslatedContent[prj] ??= {};
        unstranslatedContent[prj][tu.rid] ??= {};
        unstranslatedContent[prj][tu.rid][tu.sid] = tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src;
    }
    for (const [prj, uc] of Object.entries(unstranslatedContent)) {
        console.log(`  Project: ${prj}`);
        for (const [rid, content] of Object.entries(uc)) {
            console.log(`      - ${rid}`);
            for (const [sid, src] of Object.entries(content)) {
                console.log(`        - ${consoleColor.dim}${sid}:${consoleColor.reset} ${sid === src ? '≣' : src}`);
            }
        }
    }
}
