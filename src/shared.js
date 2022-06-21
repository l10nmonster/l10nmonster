import {
    createHash,
} from 'crypto';
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

export function generateGuid(str) {
    const sidContentHash = createHash('sha256');
    sidContentHash.update(str, 'utf8');
    return sidContentHash.digest().toString('base64').substring(0, 43).replaceAll('+', '-').replaceAll('/', '_');
}

export function generateFullyQualifiedGuid(rid, sid, str) {
    return generateGuid(`${rid}|${sid}|${str}`);
}

export function makeTU(res, segment) {
    const { str, nstr, ...seg } = segment;
    const tu = {
        ...seg,
        src: str,
        contentType: res.contentType,
        rid: res.id,
        ts: new Date(res.modified).getTime(),
    };
    if (nstr !== undefined) {
        tu.nsrc = nstr;
    }
    if (res.prj !== undefined) {
        tu.prj = res.prj;
    }
    return tu;
}

// https://stackoverflow.com/questions/12484386/access-javascript-property-case-insensitively
export function fixCaseInsensitiveKey(object, key) {
    const asLowercase = key.toLowerCase();
    return Object.keys(object).find(k => k.toLowerCase() === asLowercase);
}

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

export function printLeverage(leverage, detailed) {
    const totalStrings = leverage.translated + leverage.pending + leverage.untranslated + leverage.internalRepetitions;
    detailed && console.log(`    - total strings for target language: ${totalStrings.toLocaleString()} (${leverage.translatedWords.toLocaleString()} translated words)`);
    for (const [q, num] of Object.entries(leverage.translatedByQ).sort((a,b) => b[1] - a[1])) {
        detailed && console.log(`    - translated strings @ quality ${q}: ${num.toLocaleString()}`);
    }
    leverage.pending && console.log(`    - strings pending translation: ${leverage.pending.toLocaleString()} (${leverage.pendingWords.toLocaleString()} words)`);
    leverage.untranslated && console.log(`    - untranslated unique strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * .2).toFixed(2)})`);
    leverage.internalRepetitions && console.log(`    - untranslated repeated strings: ${leverage.internalRepetitions.toLocaleString()} (${leverage.internalRepetitionWords.toLocaleString()} words)`);
}

export function computeTotals(totals, partial) {
    for (const [ k, v ] of Object.entries(partial)) {
        if (typeof v === 'object') {
            totals[k] ??= {};
            computeTotals(totals[k], v);
        } else {
            totals[k] ??= 0;
            totals[k] += v;
        }
    }
}
