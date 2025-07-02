import { consoleLog } from '../l10nContext.js';
import { utils } from '../helpers/index.js';

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
        consoleLog`Project: ${prj}`;
        for (const [rid, content] of Object.entries(uc)) {
            consoleLog`  ‣ ${rid}`;
            for (const [sid, str] of Object.entries(content)) {
                console.log(`    ∙ ${consoleColor.dim}${sid}:${consoleColor.reset} ${str.color}${sid === str.txt ? '≣' : str.txt}${consoleColor.reset}`);
            }
        }
    }
}

export function printRequest(job) {
    const untranslatedContent = {};
    // const srcLang = job.sourceLang.substring(0, 2);
    for (const tu of job.tus) {
        const prj = tu.prj || 'default';
        untranslatedContent[prj] ??= {};
        untranslatedContent[prj][tu.rid] ??= {};
        untranslatedContent[prj][tu.rid][tu.sid] = {
            txt: utils.flattenNormalizedSourceV1(tu.nsrc)[0],
            // eslint-disable-next-line no-nested-ternary
            color: consoleColor.green,
        }
    }
    printContent(untranslatedContent);
}

export function printResponse(job, showPairs) {
    const translations = job.tus.reduce((p,c) => (p[c.guid] = c.ntgt, p), {});
    let matchedTranslations = 0;
    const translatedContent = {};
    for (const tu of job.tus) {
        const prj = tu.prj || 'default';
        translatedContent[prj] ??= {};
        translatedContent[prj][tu.rid] ??= {};
        if (translations[tu.guid]) {
            const key = showPairs ? utils.flattenNormalizedSourceV1(tu.nsrc)[0] : tu.sid;
            translatedContent[prj][tu.rid][key] = {
                txt: utils.flattenNormalizedSourceV1(translations[tu.guid])[0],
                color: consoleColor.green,
            };
            matchedTranslations++;
        }
    }
    if (job.tus.length !== matchedTranslations) {
        consoleLog`${consoleColor.red}${job.tus.length} TU in request, ${job.tus.length} TU in response, ${matchedTranslations} matching translations${consoleColor.reset}`;
    }
    printContent(translatedContent);
}


