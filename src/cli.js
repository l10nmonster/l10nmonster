/* eslint-disable no-negated-condition */
import {
    writeFileSync,
  } from 'fs';
import { analyzeCmd } from './analyzeCmd.js';
import { pullCmd } from './pullCmd.js';
import { pushCmd } from './pushCmd.js';
import { jobPushCmd } from './jobCmd.js';
import { statusCmd } from './statusCmd.js';
import { jobsCmd } from './jobsCmd.js';
import { tmExportCmd } from './tmExportCmd.js';
import { translateCmd } from './translateCmd.js';

import {
    consoleColor, fixCaseInsensitiveKey,
    printRequest, printResponse,
    printLeverage, computeTotals,
} from './shared.js';

export async function status(monsterManager, options) {
    const limitToLang = options.lang;
    const all = Boolean(options.all);
    const output = options.output;
    const status = await statusCmd(monsterManager, { limitToLang });
    if (output) {
        writeFileSync(output, JSON.stringify(status, null, '\t'), 'utf8');
    } else {
        console.log(`${status.numSources.toLocaleString()} translatable resources`);
        for (const [lang, langStatus] of Object.entries(status.lang)) {
            console.log(`\n${consoleColor.bright}Language ${lang}${consoleColor.reset} (minimum quality ${langStatus.leverage.minimumQuality}, TM size:${langStatus.leverage.tmSize.toLocaleString()}):`);
            const totals = {};
            const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => (a[0] > b[0] ? 1 : -1));
            for (const [prj, leverage] of prjLeverage) {
                computeTotals(totals, leverage);
                const untranslated = leverage.pending + leverage.untranslated + leverage.internalRepetitions;
                if (leverage.translated + untranslated > 0) {
                    (all || untranslated > 0) && console.log(`  Project: ${consoleColor.bright}${prj}${consoleColor.reset}`);
                    printLeverage(leverage, all);
                }
            }
            if (prjLeverage.length > 1) {
                console.log(`  Total:`);
                printLeverage(totals, true);
            }
        }
    }
}

export async function jobs(monsterManager, options) {
    const limitToLang = options.lang;
    const jobs = await jobsCmd(monsterManager, { limitToLang });
    for (const [lang, jobManifests] of Object.entries(jobs)) {
        if (jobManifests.length > 0) {
            console.log(`Target language ${consoleColor.bright}${lang}${consoleColor.reset}:`);
            for (const mf of jobManifests) {
                const numUnits = mf.inflight?.length ?? mf.tus?.length ?? 0;
                const lastModified = new Date(mf.updatedAt);
                console.log(`  Job ${mf.jobGuid}: status ${consoleColor.bright}${mf.status}${consoleColor.reset} ${numUnits.toLocaleString()} ${mf.sourceLang} units with ${mf.translationProvider} - ${lastModified.toDateString()} ${lastModified.toLocaleTimeString()}`);
            }
        }
    }
}

export async function analyze(monsterManager, options) {
    try {
        if (options.analyzer) {
            const analyzer = fixCaseInsensitiveKey(monsterManager.analyzers, options.analyzer);
            const Analyzer = monsterManager.analyzers[analyzer];
            if (!Analyzer) {
                throw `couldn't find a ${analyzer} analyzer`;
            }
            const analysis = await analyzeCmd(monsterManager, Analyzer, options.params, options.lang, options.filter);
            const header = Analyzer.analysisStructure;
            if (options.output) {
                const rows = header ? [ header, ...analysis].map(row => row.join(',')) : analysis;
                rows.push('\n');
                writeFileSync(options.output, rows.join('\n'));
            } else {
                if (header) { // structured analysis
                    const groups = Analyzer.analysisGroupBy;
                    let previousGroup;
                    for (const row of analysis) {
                        const columns = row.map((col, idx) => [col, idx]);
                        if (groups) {
                            // eslint-disable-next-line no-unused-vars
                            const currentGroup = columns.filter(([col, idx]) => groups.includes(header[idx]));
                            // eslint-disable-next-line no-unused-vars
                            const currentGroupSmashed = currentGroup.map(([col, idx]) => col).join('|');
                            if (currentGroupSmashed !== previousGroup) {
                                previousGroup = currentGroupSmashed;
                                console.log(currentGroup
                                    .map(([col, idx]) => `${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${consoleColor.bright}${col}${consoleColor.reset}`)
                                    .join('\t'));
                            }
                        }
                        const currentData = columns.filter(([col, idx]) => (!groups || !groups.includes(header[idx])) && col !== null && col !== undefined);
                        console.log(currentData
                            .map(([col, idx]) => `\t${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${col}`)
                            .join(''));
                    }
                } else { // unstructured analysis
                    console.log(analysis.join('\n'));
                }
            }
        } else {
            console.log('Available analyzers:');
            for (const [name, analyzer] of Object.entries(monsterManager.analyzers)) {
                console.log(`  - ${consoleColor.bright}${name} ${analyzer.helpParams ?? ''}${consoleColor.reset} ${analyzer.help}`);
            }
        }
    } catch (e) {
        console.error(`Failed to analyze: ${e.stack || e}`);
    }
}

export async function push(monsterManager, options) {
    const limitToLang = options.lang;
    const tuFilter = options.filter;
    const driverOption = options.driver ?? 'untranslated';
    const driver = {};
    if (driverOption.indexOf('job:') === 0) {
        driver.jobGuid = driverOption.split(':')[1];
    } else if ([ 'untranslated', 'source', 'tm' ].includes(driverOption)) {
        driver[driverOption] = true;
    } else {
        throw `invalid ${driverOption} driver`;
    }
    const refresh = options.refresh;
    const leverage = options.leverage;
    const dryRun = options.dryrun;
    const instructions = options.instructions;
    console.log(`Pushing content upstream...${dryRun ? ' (dry run)' : ''}`);
    try {
        if (dryRun) {
            const status = await pushCmd(monsterManager, { limitToLang, tuFilter, driver, refresh, leverage, dryRun, instructions });
            for (const langStatus of status) {
                console.log(`\nDry run of ${langStatus.sourceLang} -> ${langStatus.targetLang} push:`);
                printRequest(langStatus);
            }
        } else {
            let status = [];
            for (const provider of (options.provider ?? 'default').split(',')) {
                const translationProviderName = provider.toLowerCase() === 'default' ? undefined : provider;
                status.push(await pushCmd(monsterManager, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions }));
            }
            status = status.flat(1);
                if (status.length > 0) {
                for (const ls of status) {
                    if (ls.minimumJobSize !== undefined) {
                        console.log(`${ls.num.toLocaleString()} translations units for language ${ls.targetLang} not sent to provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} because you need at least ${ls.minimumJobSize}`);
                    } else {
                        console.log(`job ${ls.jobGuid} with ${ls.num.toLocaleString()} translations received for language ${consoleColor.bright}${ls.targetLang}${consoleColor.reset} from provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} -> status: ${consoleColor.bright}${ls.status}${consoleColor.reset}`);
                    }
                }
            } else {
                console.log('Nothing to push!');
            }
        }
    } catch (e) {
        console.error(`Failed to push: ${e.stack || e}`);
    }
}

export async function job(monsterManager, options) {
    const reqJobGuid = options.req;
    const resJobGuid = options.res;
    const pairsJobGuid = options.pairs;
    const pushJobGuid = options.push;
    const deleteJobGuid = options.delete;
    if (reqJobGuid !== undefined) {
        const req = await monsterManager.jobStore.getJobRequest(reqJobGuid);
        if (req) {
            console.log(`Showing request of job ${reqJobGuid} ${req.sourceLang} -> ${req.targetLang}`);
            printRequest(req);
        } else {
            console.error('Could not fetch the specified job');
        }
    } else if (resJobGuid !== undefined) {
        const req = await monsterManager.jobStore.getJobRequest(resJobGuid);
        const res = await monsterManager.jobStore.getJob(resJobGuid);
        if (req && res) {
            console.log(`Showing response of job ${resJobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
            printResponse(req, res);
        } else {
            console.error('Could not fetch the specified job');
        }
    } else if (pairsJobGuid !== undefined) {
        const req = await monsterManager.jobStore.getJobRequest(pairsJobGuid);
        const res = await monsterManager.jobStore.getJob(pairsJobGuid);
        if (req && res) {
            console.log(`Showing source-target pairs of job ${pairsJobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
            printResponse(req, res, true);
        } else {
            console.error('Could not fetch the specified job');
        }
    } else if (pushJobGuid !== undefined) {
        console.log(`Pushing job ${pushJobGuid}...`);
        try {
            const pushResponse = await jobPushCmd(monsterManager, pushJobGuid);
            console.log(`${pushResponse.num.toLocaleString()} translations units requested -> status: ${pushResponse.status}`);
        } catch (e) {
            console.error(`Failed to push job: ${e}`);
        }
    } else if (deleteJobGuid !== undefined) {
        console.log(`Deleting job ${deleteJobGuid}...`);
        try {
            const res = await monsterManager.jobStore.getJob(deleteJobGuid);
            if (res) {
                console.error(`Can only delete blocked/failed jobs. This job has status: ${res.status}`);
            } else {
                await monsterManager.jobStore.deleteJobRequest(deleteJobGuid);
            }
        } catch (e) {
            console.error(`Failed to push job: ${e}`);
        }
    } else {
        console.error(`Nothing to do!`);
    }
}

export async function pull(monsterManager, options) {
    const limitToLang = options.lang;
    const partial = options.partial;
    console.log(`Pulling pending translations...`);
    const stats = await pullCmd(monsterManager, { limitToLang, partial });
    console.log(`Checked ${stats.numPendingJobs.toLocaleString()} pending jobs, ${stats.doneJobs.toLocaleString()} done jobs, ${stats.newPendingJobs.toLocaleString()} pending jobs created, ${stats.translatedStrings.toLocaleString()} translated strings found`);
}

export async function translate(monsterManager, options) {
    const limitToLang = options.lang;
    const dryRun = options.dryrun;
    console.log(`Generating translated resources for ${limitToLang ? limitToLang : 'all languages'}...${dryRun ? ' (dry run)' : ''}`);
    const status = await translateCmd(monsterManager, { limitToLang, dryRun });
    if (dryRun) {
        for (const [lang, diff] of Object.entries(status.diff)) {
            for (const [fname, lines] of Object.entries(diff)) {
                console.log(`${lang}: diffing ${fname}\n${lines}`);
            }
        }
    } else {
        for (const [lang, files] of Object.entries(status.generatedResources)) {
            console.log(`  - ${lang}: ${files.length} resources generated`);
        }
        for (const [lang, files] of Object.entries(status.deleteResources)) {
            console.log(`  - ${lang}: ${files.length} resources deleted`);
        }
    }
}

export async function tmexport(monsterManager, options) {
    const format = options.format;
    const mode = options.mode;
    const limitToLang = options.lang;
    if (['job', 'json', 'tmx'].includes(format)) {
        if (['source', 'tm'].includes(mode)) {
            console.log(`Exporting TM in mode ${consoleColor.bright}${mode}${consoleColor.reset} and format ${consoleColor.bright}${format}${consoleColor.reset} for ${consoleColor.bright}${limitToLang ? limitToLang : 'all languages'}${consoleColor.reset}...`);
            const status = await tmExportCmd(monsterManager, { limitToLang, mode, format });
            console.log(`Generated files: ${status.files.join(', ')}`);
        } else {
            console.error('Invalid mode');
        }
    } else {
        console.error('Invalid export format');
    }
}

// this seems useless but it still initializes MonsterManager, loads
// all sources and all TM's, so it can be used as a no-op to test the
// config/initialization process and debug
// lifted from https://www.asciiart.eu/mythology/monsters
export async function monster(monsterManager) {
    console.log(`
    _.------.                        .----.__
   /         \\_.       ._           /---.__  \\
  |  O    O   |\\\\___  //|          /       \`\\ |
  |  .vvvvv.  | )   \`(/ |         | o     o  \\|
  /  |     |  |/      \\ |  /|   ./| .vvvvv.  |\\
 /   \`^^^^^'  / _   _  \`|_ ||  / /| |     |  | \\
./  /|         | O)  O   ) \\|| //' | \`^vvvv'  |/\\\\
/   / |         \\        /  | | ~   \\          |  \\\\
\\  /  |        / \\ Y   /'   | \\     |          |   ~
\`'   |  _     |  \`._/' |   |  \\     7        /
 _.-'-' \`-'-'|  |\`-._/   /    \\ _ /    .    |
__.-'            \\  \\   .   / \\_.  \\ -|_/\\/ \`--.|_
--'                  \\  \\ |   /    |  |              \`-
               \\uU \\UU/     |  /   :F_P:
`);
    console.time('initialization time');
    const sources = await monsterManager.source.getEntries();
    const numSegments = sources.reduce((p, c) => p + c[1].segments.length, 0);
    const targetLangs = (await monsterManager.source.getTargetLangs()).sort();
    console.log(`${numSegments} segments in ${sources.length} resources needing ${targetLangs.length} languages`);
    for (const targetLang of targetLangs) {
        const tm = await monsterManager.tmm.getTM(monsterManager.sourceLang, targetLang);
        console.log(`${targetLang} TM has ${tm.guids.length} entries`);
    }
    console.timeEnd('initialization time');
}
