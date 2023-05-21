/* eslint-disable no-negated-condition */
import {
    writeFileSync,
  } from 'fs';
import * as path from 'path';
import { analyzeCmd } from './commands/analyze.js';
import { pullCmd } from './commands/pull.js';
import { snapCmd } from './commands/snap.js';
import { pushCmd } from './commands/push.js';
import { jobPushCmd } from './commands/job.js';
import { statusCmd } from './commands/status.js';
import { jobsCmd } from './commands/jobs.js';
import { tmExportCmd } from './commands/tmExport.js';
import { translateCmd } from './commands/translate.js';
import { createMonsterManager } from './defaultMonster.js';

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
        console.log(`${consoleColor.reset}${status.numSources.toLocaleString()} translatable resources`);
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
            const header = analysis.head;
            if (options.output) {
                const rows = header ? [ header, ...analysis.body].map(row => row.join(',')) : analysis.body;
                rows.push('\n');
                writeFileSync(options.output, rows.join('\n'));
            } else {
                if (header) { // structured analysis
                    const groups = analysis.groupBy;
                    let previousGroup;
                    for (const row of analysis.body) {
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
                    console.log(analysis.body.join('\n'));
                }
            }
        } else {
            console.log('Available analyzers:');
            for (const [name, analyzer] of Object.entries(monsterManager.analyzers)) {
                console.log(`  ${typeof analyzer.prototype.processSegment === 'function' ? '(src)' : ' (tu)'} ${consoleColor.bright}${name} ${analyzer.helpParams ?? ''}${consoleColor.reset} ${analyzer.help}`);
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
    const op = options.operation;
    const jobGuid = options.jobGuid;
    if (op === 'req') {
        const req = await monsterManager.jobStore.getJobRequest(jobGuid);
        if (req) {
            console.log(`Showing request of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang}`);
            printRequest(req);
        } else {
            console.error('Could not fetch the specified job');
        }
    } else if (op === 'res') {
        const req = await monsterManager.jobStore.getJobRequest(jobGuid);
        const res = await monsterManager.jobStore.getJob(jobGuid);
        if (req && res) {
            console.log(`Showing response of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
            printResponse(req, res);
        } else {
            console.error('Could not fetch the specified job');
        }
    } else if (op === 'pairs') {
        const req = await monsterManager.jobStore.getJobRequest(jobGuid);
        const res = await monsterManager.jobStore.getJob(jobGuid);
        if (req && res) {
            console.log(`Showing source-target pairs of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
            printResponse(req, res, true);
        } else {
            console.error('Could not fetch the specified job');
        }
    } else if (op === 'push') {
        console.log(`Pushing job ${jobGuid}...`);
        try {
            const pushResponse = await jobPushCmd(monsterManager, jobGuid);
            console.log(`${pushResponse.num.toLocaleString()} translations units requested -> status: ${pushResponse.status}`);
        } catch (e) {
            console.error(`Failed to push job: ${e}`);
        }
    } else if (op === 'delete') {
        console.log(`Deleting job ${jobGuid}...`);
        try {
            const res = await monsterManager.jobStore.getJob(jobGuid);
            if (res) {
                console.error(`Can only delete blocked/failed jobs. This job has status: ${res.status}`);
            } else {
                await monsterManager.jobStore.deleteJobRequest(jobGuid);
            }
        } catch (e) {
            console.error(`Failed to push job: ${e}`);
        }
    } else {
        console.error(`Invalid operation: ${op}`);
    }
}

export async function pull(monsterManager, options) {
    const limitToLang = options.lang;
    const partial = options.partial;
    console.log(`Pulling pending translations...`);
    const stats = await pullCmd(monsterManager, { limitToLang, partial });
    console.log(`Checked ${stats.numPendingJobs.toLocaleString()} pending jobs, ${stats.doneJobs.toLocaleString()} done jobs, ${stats.newPendingJobs.toLocaleString()} pending jobs created, ${stats.translatedStrings.toLocaleString()} translated strings found`);
}

export async function snap(monsterManager, options) {
    console.log(`Taking a snapshot of sources...`);
    const numSources = await snapCmd(monsterManager, options);
    console.log(`${numSources} sources committed`);
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
    const prjsplit = options.prjsplit;
    if (['job', 'json', 'tmx'].includes(format)) {
        if (['source', 'tm'].includes(mode)) {
            console.log(`Exporting TM in mode ${consoleColor.bright}${mode}${consoleColor.reset} and format ${consoleColor.bright}${format}${consoleColor.reset} for ${consoleColor.bright}${limitToLang ? limitToLang : 'all languages'}${consoleColor.reset}...`);
            const status = await tmExportCmd(monsterManager, { limitToLang, mode, format, prjsplit });
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
    console.time('Initialization time');
    const resourceStats = await monsterManager.source.getResourceStats();
    const targetLangs = await monsterManager.getTargetLangs(false, true);
    console.log(`Resources: ${resourceStats.length}`);
    console.log(`Possible languages: ${targetLangs.join(', ')}`);
    console.log('Translation Memories:')
    const availableLangPairs = (await monsterManager.jobStore.getAvailableLangPairs()).sort();
    for (const [sourceLang, targetLang] of availableLangPairs) {
        const tm = await monsterManager.tmm.getTM(sourceLang, targetLang);
        console.log(`  - ${sourceLang} / ${targetLang} (${tm.guids.length} entries)`);
    }
    console.timeEnd('Initialization time');
    const printCapabilities = cap => `${Object.entries(cap).map(([cmd, available]) => `${available ? consoleColor.green : consoleColor.red}${cmd}`).join(' ')}${consoleColor.reset}`;
    console.log(`\nYour config allows the following commands: ${printCapabilities(monsterManager.capabilities)}`);
    if (Object.keys(monsterManager.capabilitiesByType).length > 1) {
        Object.entries(monsterManager.capabilitiesByType).forEach(([type, cap]) => console.log(`  - ${type}: ${printCapabilities(cap)}`));
    }
}

export async function runL10nMonster(relativePath, globalOptions, cb) {
    const configPath = path.resolve('.', relativePath);

    await createMonsterManager(configPath, globalOptions, async mm => {
        await cb({
            status: opts => status(mm, { ...globalOptions, ...opts}),
            jobs: opts => jobs(mm, { ...globalOptions, ...opts}),
            analyze: opts => analyze(mm, { ...globalOptions, ...opts}),
            push: opts => push(mm, { ...globalOptions, ...opts}),
            job: opts => job(mm, { ...globalOptions, ...opts}),
            pull: opts => pull(mm, { ...globalOptions, ...opts}),
            snap: opts => snap(mm, { ...globalOptions, ...opts}),
            translate: opts => translate(mm, { ...globalOptions, ...opts}),
            tmexport: opts => tmexport(mm, { ...globalOptions, ...opts}),
            monster: opts => monster(mm, { ...globalOptions, ...opts}),
        });
        mm && (await mm.shutdown());
    });
}
