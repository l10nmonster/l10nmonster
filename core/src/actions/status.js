import { writeFileSync } from 'fs';
import { consoleLog, utils } from '@l10nmonster/core';

function computeTotals(totals, partial) {
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

function printLeverage(leverage, detailed) {
    const totalStrings = leverage.translated + leverage.pending + leverage.untranslated + leverage.internalRepetitions;
    detailed && consoleLog`    - total strings for target language: ${totalStrings.toLocaleString()} (${leverage.translatedWords.toLocaleString()} translated words)`;
    for (const [q, num] of Object.entries(leverage.translatedByQ).sort((a,b) => b[1] - a[1])) {
        detailed && consoleLog`    - translated strings @ quality ${q}: ${num.toLocaleString()}`;
    }
    leverage.pending && consoleLog`    - strings pending translation: ${leverage.pending.toLocaleString()} (${leverage.pendingWords.toLocaleString()} words)`;
    leverage.untranslated && consoleLog`    - untranslated unique strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * .2).toFixed(2)})`;
    leverage.internalRepetitions && consoleLog`    - untranslated repeated strings: ${leverage.internalRepetitions.toLocaleString()} (${leverage.internalRepetitionWords.toLocaleString()} words)`;
}

async function getStatusForAllPairs(mm, method) {
    const status = {};
    const langPairs = await mm.rm.getAvailableLangPairs();
    for (const [ sourceLang, targetLang ] of langPairs) {
        const tm = mm.tmm.getTM(sourceLang, targetLang);
        status[targetLang] ??= {};
        status[targetLang][sourceLang] = tm[method]();
    }
    return status;
}

export class status {
    static help = {
        description: 'translation status of content.',
        arguments: [
            [ '[focus]', 'area of focus', ['summary', 'untranslated'] ],
        ],
        options: [
            [ '-l, --lang <language>', 'only get status of target language' ],
            [ '-a, --all', 'show information for all projects, not just untranslated ones' ],
            [ '--output <filename>', 'write status to the specified file' ],
        ]
    };

    static async action(mm, options) {
        if (options.focus === 'summary') {
            consoleLog`Active Content Translation Status`;
            const status = await getStatusForAllPairs(mm, 'getActiveContentTranslationStatus');
            // console.dir(status, { depth: null });
            for (const [targetLang, targetLangStatus] of Object.entries(status)) {
                let previousSourceLang, previousMinQ;
                for (const [sourceLang, pairStats] of Object.entries(targetLangStatus)) {
                    for (const chStatus of pairStats) {
                        if (previousSourceLang !== sourceLang || previousMinQ !== chStatus.minQ) {
                            consoleLog`\n  ‣ Translation pair ${sourceLang} → ${targetLang}(${chStatus.minQ})`;
                            previousSourceLang = sourceLang;
                            previousMinQ = chStatus.minQ;
                        }
                        const tuType = chStatus.q === null ? 'untranslated' : (chStatus.q === 0 ? 'in-flight' : `translated(${chStatus.q})`);
                        consoleLog`      • ch: ${chStatus.channel} prj: ${chStatus.prj ?? 'default'} ${tuType} ${chStatus.res.toLocaleString()} ${[chStatus.res, 'resource', 'resources']} with ${chStatus.seg.toLocaleString()} ${[chStatus.seg, 'segment', 'segments']} ${chStatus.words.toLocaleString()} ${[chStatus.words, 'word', 'words']} ${chStatus.chars.toLocaleString()} ${[chStatus.chars, 'char', 'chars']}`;
                    }
                }
            }
            return;
        }
        if (options.focus === 'untranslated') {
            consoleLog`Untranslated Content Status (total untranslated/internal leverage/tm leverage)`;
            const status = await getStatusForAllPairs(mm, 'getUntranslatedContent');
            // console.dir(status, { depth: null });
            for (const [targetLang, targetLangStatus] of Object.entries(status)) {
                for (const [sourceLang, pairSegments] of Object.entries(targetLangStatus)) {
                    consoleLog`\n  ‣ Translation pair ${sourceLang} → ${targetLang}`;
                    if (pairSegments.length > 0) {
                        const tm = mm.tmm.getTM(sourceLang, targetLang);
                        const repetitionMap = {};
                        const pairStats = {};
                        for (const seg of pairSegments) {
                            const stats = pairStats[`${seg.channel}|${seg.prj}`] ??= { channel: seg.channel, prj: seg.prj, res: new Set(), segs: 0, words: 0, chars: 0, repSegs: 0, repWords: 0, repChars: 0, intSegs: 0, intWords: 0, intChars: 0 };
                            const gstr = utils.flattenNormalizedSourceToOrdinal(seg.nstr);
                            if (repetitionMap[gstr]) {
                                    stats.intSegs++;
                                    stats.intWords += seg.words;
                                    stats.intChars += seg.chars;
                                } else {
                                if (tm.getExactMatches(seg.nstr).some(tu => tu.q >= seg.minQ || tu.inflight)) {
                                    stats.repSegs++;
                                    stats.repWords += seg.words;
                                    stats.repChars += seg.chars;
                                }
                                repetitionMap[gstr] = true;
                            }
                            stats.res.add(seg.rid);
                            stats.segs++;
                            stats.words += seg.words;
                            stats.chars += seg.chars;
                        }
                        for (const stats of Object.values(pairStats)) {
consoleLog`      • ch: ${stats.channel} prj: ${stats.prj ?? 'default'} \
resources: ${stats.res.size.toLocaleString()} \
segments: ${stats.segs.toLocaleString()}/${stats.intSegs.toLocaleString()}/${stats.repSegs.toLocaleString()} \
words: ${stats.words.toLocaleString()}/${stats.intWords.toLocaleString()}/${stats.repWords.toLocaleString()} \
chars: ${stats.chars.toLocaleString()}/${stats.intChars.toLocaleString()}/${stats.repChars.toLocaleString()}`;
                        }
                    } else {
                        consoleLog`      • fully translated`;
                    }
                }
            }
            return;
        }
        if (!options.focus) {
            const limitToLang = options.lang;
            const all = Boolean(options.all);
            const output = options.output;
            const status = {
                lang: {},
                numSources: 0,
            };
            const targetLangs = await mm.getTargetLangs(limitToLang);
            for (const targetLang of targetLangs) {
                const leverage = await mm.estimateTranslationJob({ targetLang });
                status.lang[targetLang] = {
                    leverage,
                };
                status.numSources = leverage.numSources;
            }
            if (output) {
                writeFileSync(output, JSON.stringify(status, null, '\t'), 'utf8');
            } else {
                const numLangs = Object.keys(status.lang).length;
                consoleLog`${status.numSources.toLocaleString()} translatable ${[status.numSources, 'resource', 'resources']} in ${numLangs} ${[numLangs, 'language', 'languages']} -- showing status of ${all ? 'all' : 'untranslated'} projects`;
                for (const [lang, targetLangStatus] of Object.entries(status.lang)) {
                    consoleLog`\nLanguage ${lang} (minimum quality: ${targetLangStatus.leverage.minimumQuality})`;
                    const totals = {};
                    const prjLeverage = Object.entries(targetLangStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
                    for (const [prj, leverage] of prjLeverage) {
                        computeTotals(totals, leverage);
                        const untranslated = leverage.pending + leverage.untranslated + leverage.internalRepetitions;
                        if (leverage.translated + untranslated > 0) {
                            (all || untranslated > 0) && consoleLog`  Project: ${prj}`;
                            printLeverage(leverage, all);
                        }
                    }
                    if (prjLeverage.length > 1) {
                        consoleLog`  Total:`;
                        printLeverage(totals, true);
                    }
                }
            }
            return status;
        }
    }
}
