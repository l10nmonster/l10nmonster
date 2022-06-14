import { flattenNormalizedSourceV1 } from './normalizers/util.js';
import tinyld from 'tinyld';
// import LD from 'languagedetect';
// const lngDetector = new LD();
// lngDetector.setLanguageType('iso2');

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
export const consoleColor = {
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bright: '\x1b[1m',
};

function printContent(contentPairs) {
    for (const [prj, uc] of Object.entries(contentPairs)) {
        console.log(`Project: ${prj}`);
        for (const [rid, content] of Object.entries(uc)) {
            console.log(`  ‣ ${rid}`);
            for (const [sid, str] of Object.entries(content)) {
                console.log(`    ∙ ${consoleColor.dim}${sid}:${consoleColor.reset} ${str.color}${str.confidence ? `[${str.confidence.toFixed(2)}] ` : ''}${sid === str.txt ? '≣' : str.txt}${consoleColor.reset}`);
            }
        }
    }
}

export function printRequest(req) {
    const untranslatedContent = {};
    const srcLang = req.sourceLang.substring(0, 2);
    for (const tu of req.tus) {
        const prj = tu.prj || 'default';
        untranslatedContent[prj] ??= {};
        untranslatedContent[prj][tu.rid] ??= {};
        const text = tu.nsrc ? tu.nsrc.map(e => (typeof e === 'string' ? e : '')).join('') : tu.src;
        // const heuristics = Object.fromEntries(lngDetector.detect(text, 1));
        const heuristics = Object.fromEntries(tinyld.detectAll(text).map(x => [ x.lang, x.accuracy ]));
        const confidence = heuristics[srcLang] ?? 0;
        untranslatedContent[prj][tu.rid][tu.sid] = {
            confidence,
            txt: tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src,
            // eslint-disable-next-line no-nested-ternary
            color: confidence <= 0.1 ? consoleColor.red : (confidence <= 0.2 ? consoleColor.yellow : consoleColor.green),
        }
    }
    printContent(untranslatedContent);
}

export function printResponse(req, res, showPair) {
    const translations = res.tus.reduce((p,c) => (p[c.guid] = c.ntgt ?? c.tgt, p), {});
    let matchedTranslations = 0;
    const translatedContent = {};
    for (const tu of req.tus) {
        const prj = tu.prj || 'default';
        translatedContent[prj] ??= {};
        translatedContent[prj][tu.rid] ??= {};
        if (translations[tu.guid]) {
            // eslint-disable-next-line no-nested-ternary
            const key = showPair ? (tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src) : tu.sid;
            translatedContent[prj][tu.rid][key] = {
                txt: Array.isArray(translations[tu.guid]) ? flattenNormalizedSourceV1(translations[tu.guid])[0] : translations[tu.guid],
                color: consoleColor.green,
            };
            matchedTranslations++;
        }
    }
    if (req.tus.length !== res.tus.length || req.tus.length !== matchedTranslations) {
        console.log(`${consoleColor.red}${req.tus.length} TU in request, ${res.tus.length} TU in response, ${matchedTranslations} matching translations${consoleColor.reset}`);
    }
    printContent(translatedContent);
}
