import { flattenNormalizedSourceV1 } from '../normalizers/util.js';

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
export const consoleColor = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bright: '\x1b[1m',
};

function printContent(contentPairs) {
    for (const [prj, uc] of Object.entries(contentPairs)) {
        console.log(`  Project: ${prj}`);
        for (const [rid, content] of Object.entries(uc)) {
            console.log(`      - ${rid}`);
            for (const [sid, src] of Object.entries(content)) {
                console.log(`        - ${consoleColor.dim}${sid}:${consoleColor.reset} ${sid === src ? '≣' : src}`);
            }
        }
    }
}

export function printRequest(req) {
    const untranslatedContent = {};
    for (const tu of req.tus) {
        const prj = tu.prj || 'default';
        untranslatedContent[prj] ??= {};
        untranslatedContent[prj][tu.rid] ??= {};
        untranslatedContent[prj][tu.rid][tu.sid] = tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src;
    }
    printContent(untranslatedContent);
}

export function printResponse(req, res, showPair) {
    const translations = res.tus.reduce((p,c) => (p[c.guid] = c.ntgt ?? c.tgt, p), {});
    if (req.tus.length !== res.tus.length || req.tus.length !== Object.keys(translations).length) {
        console.log(`${req.tus.length} TU in request, ${res.tus.length} TU in response, ${Object.keys(translations).length} matching translations`);
    }
    const translatedContent = {};
    for (const tu of req.tus) {
        const prj = tu.prj || 'default';
        translatedContent[prj] ??= {};
        translatedContent[prj][tu.rid] ??= {};
        if (translations[tu.guid]) {
            // eslint-disable-next-line no-nested-ternary
            const key = showPair ? (tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src) : tu.sid;
            translatedContent[prj][tu.rid][key] = Array.isArray(translations[tu.guid]) ? flattenNormalizedSourceV1(translations[tu.guid])[0] : translations[tu.guid];
        }
    }
    printContent(translatedContent);
}
