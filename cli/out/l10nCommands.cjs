var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// l10nCommands.js
var l10nCommands_exports = {};
__export(l10nCommands_exports, {
  builtInCmds: () => builtInCmds,
  runL10nMonster: () => runL10nMonster
});
module.exports = __toCommonJS(l10nCommands_exports);
var path = __toESM(require("path"), 1);
var util = __toESM(require("node:util"), 1);
var winston = __toESM(require("winston"), 1);
var import_core8 = require("@l10nmonster/core");

// analyze.js
var import_fs = require("fs");
var import_core = require("@l10nmonster/core");

// shared.js
var import_helpers = require("@l10nmonster/helpers");
var consoleColor = {
  red: "\x1B[31m",
  yellow: "\x1B[33m",
  green: "\x1B[32m",
  reset: "\x1B[0m",
  dim: "\x1B[2m",
  bright: "\x1B[1m"
};
function printContent(contentPairs) {
  for (const [prj, uc] of Object.entries(contentPairs)) {
    console.log(`Project: ${prj}`);
    for (const [rid, content] of Object.entries(uc)) {
      console.log(`  \u2023 ${rid}`);
      for (const [sid, str] of Object.entries(content)) {
        console.log(`    \u2219 ${consoleColor.dim}${sid}:${consoleColor.reset} ${str.color}${str.confidence ? `[${str.confidence.toFixed(2)}] ` : ""}${sid === str.txt ? "\u2263" : str.txt}${consoleColor.reset}`);
      }
    }
  }
}
function printRequest(req) {
  const untranslatedContent = {};
  for (const tu of req.tus) {
    const prj = tu.prj || "default";
    untranslatedContent[prj] ??= {};
    untranslatedContent[prj][tu.rid] ??= {};
    const confidence = 1;
    untranslatedContent[prj][tu.rid][tu.sid] = {
      confidence,
      txt: import_helpers.utils.flattenNormalizedSourceV1(tu.nsrc)[0],
      // eslint-disable-next-line no-nested-ternary
      color: confidence <= 0.1 ? consoleColor.red : confidence <= 0.2 ? consoleColor.yellow : consoleColor.green
    };
  }
  printContent(untranslatedContent);
}
function printResponse(req, res, showPair) {
  const translations = res.tus.reduce((p, c) => (p[c.guid] = c.ntgt, p), {});
  let matchedTranslations = 0;
  const translatedContent = {};
  for (const tu of req.tus) {
    const prj = tu.prj || "default";
    translatedContent[prj] ??= {};
    translatedContent[prj][tu.rid] ??= {};
    if (translations[tu.guid]) {
      const key = showPair ? import_helpers.utils.flattenNormalizedSourceV1(tu.nsrc)[0] : tu.sid;
      translatedContent[prj][tu.rid][key] = {
        txt: import_helpers.utils.flattenNormalizedSourceV1(translations[tu.guid])[0],
        color: consoleColor.green
      };
      matchedTranslations++;
    }
  }
  if (req.tus.length !== res.tus.length || req.tus.length !== matchedTranslations) {
    console.log(`${consoleColor.red}${req.tus.length} TU in request, ${res.tus.length} TU in response, ${matchedTranslations} matching translations${consoleColor.reset}`);
  }
  printContent(translatedContent);
}

// analyze.js
var analyze = class {
  static async action(monsterManager, options) {
    try {
      if (options.analyzer) {
        const analysis = await (0, import_core.analyzeCmd)(monsterManager, options.analyzer, options.params, options.lang, options.filter);
        const header = analysis.head;
        if (options.output) {
          const rows = header ? [header, ...analysis.body].map((row) => row.join(",")) : analysis.body;
          rows.push("\n");
          (0, import_fs.writeFileSync)(options.output, rows.join("\n"));
        } else {
          if (header) {
            const groups = analysis.groupBy;
            let previousGroup;
            for (const row of analysis.body) {
              const columns = row.map((col, idx) => [col, idx]);
              if (groups) {
                const currentGroup = columns.filter(([col, idx]) => groups.includes(header[idx]));
                const currentGroupSmashed = currentGroup.map(([col, idx]) => col).join("|");
                if (currentGroupSmashed !== previousGroup) {
                  previousGroup = currentGroupSmashed;
                  console.log(currentGroup.map(([col, idx]) => `${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${consoleColor.bright}${col}${consoleColor.reset}`).join("	"));
                }
              }
              const currentData = columns.filter(([col, idx]) => (!groups || !groups.includes(header[idx])) && col !== null && col !== void 0);
              console.log(currentData.map(([col, idx]) => `	${consoleColor.dim}${header[idx]}: ${consoleColor.reset}${col}`).join(""));
            }
          } else {
            console.log(analysis.body.join("\n"));
          }
        }
      } else {
        console.log("Available analyzers:");
        for (const [name, analyzer] of Object.entries(monsterManager.analyzers)) {
          console.log(`  ${typeof analyzer.prototype.processSegment === "function" ? "(src)" : " (tu)"} ${consoleColor.bright}${name} ${analyzer.helpParams ?? ""}${consoleColor.reset} ${analyzer.help}`);
        }
      }
    } catch (e) {
      console.error(`Failed to analyze: ${e.stack || e}`);
    }
  }
};
__publicField(analyze, "help", {
  description: "content reports and validation.",
  arguments: [
    ["[analyzer]", "name of the analyzer to run"],
    ["[params...]", "optional parameters to the analyzer"]
  ],
  options: [
    ["-l, --lang <language>", "target language to analyze (if TM analyzer)"],
    ["--filter <filter>", "use the specified tu filter"],
    ["--output <filename>", "filename to write the analysis to)"]
  ]
});

// job.js
var import_core2 = require("@l10nmonster/core");
var job = class {
  static async action(monsterManager, options) {
    const op = options.operation;
    const jobGuid = options.jobGuid;
    if (op === "req") {
      const req = await monsterManager.jobStore.getJobRequest(jobGuid);
      if (req) {
        console.log(`Showing request of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang}`);
        printRequest(req);
      } else {
        console.error("Could not fetch the specified job");
      }
    } else if (op === "res") {
      const req = await monsterManager.jobStore.getJobRequest(jobGuid);
      const res = await monsterManager.jobStore.getJob(jobGuid);
      if (req && res) {
        console.log(`Showing response of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
        printResponse(req, res);
      } else {
        console.error("Could not fetch the specified job");
      }
    } else if (op === "pairs") {
      const req = await monsterManager.jobStore.getJobRequest(jobGuid);
      const res = await monsterManager.jobStore.getJob(jobGuid);
      if (req && res) {
        console.log(`Showing source-target pairs of job ${jobGuid} ${req.sourceLang} -> ${req.targetLang} (${res.translationProvider}) ${res.status}`);
        printResponse(req, res, true);
      } else {
        console.error("Could not fetch the specified job");
      }
    } else if (op === "push") {
      console.log(`Pushing job ${jobGuid}...`);
      try {
        const pushResponse = await (0, import_core2.jobPushCmd)(monsterManager, jobGuid);
        console.log(`${pushResponse.num.toLocaleString()} translations units requested -> status: ${pushResponse.status}`);
      } catch (e) {
        console.error(`Failed to push job: ${e.stack ?? e}`);
      }
    } else if (op === "delete") {
      console.log(`Deleting job ${jobGuid}...`);
      try {
        const res = await monsterManager.jobStore.getJob(jobGuid);
        if (res) {
          console.error(`Can only delete blocked/failed jobs. This job has status: ${res.status}`);
        } else {
          await monsterManager.jobStore.deleteJobRequest(jobGuid);
        }
      } catch (e) {
        console.error(`Failed to push job: ${e.stack ?? e}`);
      }
    } else {
      console.error(`Invalid operation: ${op}`);
    }
  }
};
__publicField(job, "help", {
  description: "show request/response/pairs of a job or push/delete jobs.",
  arguments: [
    ["<operation>", "operation to perform on job", ["req", "res", "pairs", "push", "delete"]]
  ],
  requiredOptions: [
    ["-g, --jobGuid <guid>", "guid of job"]
  ]
});

// jobs.js
var import_core3 = require("@l10nmonster/core");
var jobs = class {
  static async action(monsterManager, options) {
    const limitToLang = options.lang;
    const jobs2 = await (0, import_core3.jobsCmd)(monsterManager, { limitToLang });
    for (const [lang, jobManifests] of Object.entries(jobs2)) {
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
};
__publicField(jobs, "help", {
  description: "unfinished jobs status.",
  options: [
    ["-l, --lang <language>", "only get jobs for the target language"]
  ]
});

// monster.js
var monster = class {
  static async action(monsterManager, options) {
    console.log(
      "            _.------.                        .----.__\n           /         \\_.       ._           /---.__  \\\n          |  O    O   |\\\\___  //|          /       `\\ |\n          |  .vvvvv.  | )   `(/ |         | o     o  \\|\n          /  |     |  |/      \\ |  /|   ./| .vvvvv.  |\\\n         /   `^^^^^'  / _   _  `|_ ||  / /| |     |  | \\\n       ./  /|         | O)  O   ) \\|| //' | `^vvvv'  |/\\\\\n      /   / |         \\        /  | | ~   \\          |  \\\\\n      \\  /  |        / \\ Y   /'   | \\     |          |   ~\n       `'   |  _     |  `._/' |   |  \\     7        /\n         _.-'-' `-'-'|  |`-._/   /    \\ _ /    .    |\n    __.-'            \\  \\   .   / \\_.  \\ -|_/\\/ `--.|_\n --'                  \\  \\ |   /    |  |              `-\n                       \\uU \\UU/     |  /   :F_P:"
    );
    console.time("Initialization time");
    const resourceHandles = await monsterManager.rm.getResourceHandles();
    const targetLangs = monsterManager.getTargetLangs(options.lang);
    console.log(`Resources: ${resourceHandles.length}`);
    console.log(`Possible languages: ${targetLangs.join(", ")}`);
    console.log("Translation Memories:");
    const availableLangPairs = (await monsterManager.jobStore.getAvailableLangPairs()).sort();
    for (const [sourceLang, targetLang] of availableLangPairs) {
      const tm = await monsterManager.tmm.getTM(sourceLang, targetLang);
      console.log(`  - ${sourceLang} / ${targetLang} (${tm.guids.length} entries)`);
    }
    console.timeEnd("Initialization time");
    const printCapabilities = (cap) => `${Object.entries(cap).map(([cmd, available]) => `${available ? consoleColor.green : consoleColor.red}${cmd}`).join(" ")}${consoleColor.reset}`;
    console.log(`
Your config allows the following commands: ${printCapabilities(monsterManager.capabilities)}`);
    if (Object.keys(monsterManager.capabilitiesByChannel).length > 1) {
      Object.entries(monsterManager.capabilitiesByChannel).forEach(([channel, cap]) => console.log(`  - ${channel}: ${printCapabilities(cap)}`));
    }
  }
};
__publicField(monster, "help", {
  description: "test configuration and warm up caches",
  options: [
    ["-l, --lang <language>", "target languages to warm up"]
  ]
});

// pull.js
var import_core4 = require("@l10nmonster/core");
var pull = class {
  static async action(monsterManager, options) {
    const limitToLang = options.lang;
    const partial = options.partial;
    console.log(`Pulling pending translations...`);
    const stats = await (0, import_core4.pullCmd)(monsterManager, { limitToLang, partial });
    console.log(`Checked ${stats.numPendingJobs.toLocaleString()} pending jobs, ${stats.doneJobs.toLocaleString()} done jobs, ${stats.newPendingJobs.toLocaleString()} pending jobs created, ${stats.translatedStrings.toLocaleString()} translated strings found`);
  }
};
__publicField(pull, "help", {
  description: "receive outstanding translation jobs.",
  options: [
    ["--partial", "commit partial deliveries"],
    ["-l, --lang <language>", "only get jobs for the target language"]
  ]
});

// push.js
var import_core5 = require("@l10nmonster/core");
var push = class {
  static async action(monsterManager, options) {
    const limitToLang = options.lang;
    const tuFilter = options.filter;
    const driverOption = options.driver ?? "untranslated";
    const driver = {};
    if (driverOption.indexOf("job:") === 0) {
      driver.jobGuid = driverOption.split(":")[1];
    } else if (["untranslated", "source", "tm"].includes(driverOption)) {
      driver[driverOption] = true;
    } else {
      throw `invalid ${driverOption} driver`;
    }
    const refresh = options.refresh;
    const leverage = options.leverage;
    const dryRun = options.dryrun;
    const instructions = options.instructions;
    console.log(`Pushing content upstream...${dryRun ? " (dry run)" : ""}`);
    try {
      if (dryRun) {
        const status2 = await (0, import_core5.pushCmd)(monsterManager, { limitToLang, tuFilter, driver, refresh, leverage, dryRun, instructions });
        for (const langStatus of status2) {
          console.log(`
Dry run of ${langStatus.sourceLang} -> ${langStatus.targetLang} push:`);
          printRequest(langStatus);
        }
      } else {
        const providerList = (options.provider ?? "default").split(",");
        for (const provider of providerList) {
          const translationProviderName = provider.toLowerCase() === "default" ? void 0 : provider;
          const status2 = await (0, import_core5.pushCmd)(monsterManager, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions });
          if (status2.length > 0) {
            for (const ls of status2) {
              if (ls.minimumJobSize === void 0) {
                console.log(`job ${ls.jobGuid} with ${ls.num.toLocaleString()} translations received for language ${consoleColor.bright}${ls.targetLang}${consoleColor.reset} from provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} -> status: ${consoleColor.bright}${ls.status}${consoleColor.reset}`);
              } else {
                console.log(`${ls.num.toLocaleString()} translations units for language ${ls.targetLang} not sent to provider ${consoleColor.bright}${ls.provider}${consoleColor.reset} because you need at least ${ls.minimumJobSize}`);
              }
            }
          } else {
            console.log("Nothing to push!");
            break;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to push: ${e.stack || e}`);
    }
  }
};
__publicField(push, "help", {
  description: "push source content upstream (send to translation).",
  options: [
    ["-l, --lang <language>", "target language to push"],
    ["--filter <filter>", "use the specified tu filter"],
    ["--driver <untranslated|source|tm|job:jobGuid>", "driver of translations need to be pushed (default: untranslated)"],
    ["--leverage", "eliminate internal repetitions from untranslated driver"],
    ["--refresh", "refresh existing translations without requesting new ones"],
    ["--provider <name,...>", "use the specified translation providers"],
    ["--instructions <instructions>", "send the specified translation instructions"],
    ["--dryrun", "simulate translating and compare with existing translations"]
  ]
});

// snap.js
var import_core6 = require("@l10nmonster/core");
var snap = class {
  static async action(monsterManager, options) {
    console.log(`Taking a snapshot of sources...`);
    const numSources = await (0, import_core6.snapCmd)(monsterManager, options);
    console.log(`${numSources} sources committed`);
  }
};
__publicField(snap, "help", {
  description: "commits a snapshot of sources in normalized format.",
  options: [
    ["--maxSegments <number>", "threshold to break up snapshots into chunks"]
  ]
});

// status.js
var import_fs2 = require("fs");
var import_core7 = require("@l10nmonster/core");
function computeTotals(totals, partial) {
  for (const [k, v] of Object.entries(partial)) {
    if (typeof v === "object") {
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
  detailed && console.log(`    - total strings for target language: ${totalStrings.toLocaleString()} (${leverage.translatedWords.toLocaleString()} translated words)`);
  for (const [q, num] of Object.entries(leverage.translatedByQ).sort((a, b) => b[1] - a[1])) {
    detailed && console.log(`    - translated strings @ quality ${q}: ${num.toLocaleString()}`);
  }
  leverage.pending && console.log(`    - strings pending translation: ${leverage.pending.toLocaleString()} (${leverage.pendingWords.toLocaleString()} words)`);
  leverage.untranslated && console.log(`    - untranslated unique strings: ${leverage.untranslated.toLocaleString()} (${leverage.untranslatedChars.toLocaleString()} chars - ${leverage.untranslatedWords.toLocaleString()} words - $${(leverage.untranslatedWords * 0.2).toFixed(2)})`);
  leverage.internalRepetitions && console.log(`    - untranslated repeated strings: ${leverage.internalRepetitions.toLocaleString()} (${leverage.internalRepetitionWords.toLocaleString()} words)`);
}
var status = class {
  static async action(monsterManager, options) {
    const limitToLang = options.lang;
    const all = Boolean(options.all);
    const output = options.output;
    const status2 = await (0, import_core7.statusCmd)(monsterManager, { limitToLang });
    if (output) {
      (0, import_fs2.writeFileSync)(output, JSON.stringify(status2, null, "	"), "utf8");
    } else {
      console.log(`${consoleColor.reset}${status2.numSources.toLocaleString()} translatable resources`);
      for (const [lang, langStatus] of Object.entries(status2.lang)) {
        console.log(`
${consoleColor.bright}Language ${lang}${consoleColor.reset} (minimum quality: ${langStatus.leverage.minimumQuality})`);
        const totals = {};
        const prjLeverage = Object.entries(langStatus.leverage.prjLeverage).sort((a, b) => a[0] > b[0] ? 1 : -1);
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
};
__publicField(status, "help", {
  description: "translation status of content.",
  options: [
    ["-l, --lang <language>", "only get status of target language"],
    ["-a, --all", "show information for all projects, not just untranslated ones"],
    ["--output <filename>", "write status to the specified file"]
  ]
});

// tmexport.js
var fs = __toESM(require("fs/promises"), 1);
var import_helpers2 = require("@l10nmonster/helpers");
var tmexport = class {
  static async action(monsterManager, options) {
    const prjsplit = options.prjsplit;
    console.log(`Exporting TM for ${consoleColor.bright}${options.lang ? options.lang : "all languages"}${consoleColor.reset}...`);
    let tuFilterFunction;
    if (options.filter) {
      tuFilterFunction = monsterManager.tuFilters[import_helpers2.utils.fixCaseInsensitiveKey(monsterManager.tuFilters, options.filter)];
      if (!tuFilterFunction) {
        throw `Couldn't find ${options.filter} tu filter`;
      }
    }
    const files = [];
    const desiredTargetLangs = new Set(monsterManager.getTargetLangs(options.lang));
    const availableLangPairs = (await monsterManager.jobStore.getAvailableLangPairs()).filter((pair) => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
      const tusByPrj = {};
      const tm = await monsterManager.tmm.getTM(sourceLang, targetLang);
      tm.guids.forEach((guid) => {
        const tu = tm.getEntryByGuid(guid);
        if (!tuFilterFunction || tuFilterFunction(tu)) {
          if (!prjsplit || !l10nmonster.prj || l10nmonster.prj.includes(tu.prj)) {
            const prj = prjsplit && tu?.prj || "default";
            tusByPrj[prj] ??= [];
            tusByPrj[prj].push(tu);
          }
        }
      });
      for (const [prj, tus] of Object.entries(tusByPrj)) {
        const jobGuid = `tmexport_${prjsplit ? `${prj}_` : ""}${sourceLang}_${targetLang}`;
        const jobReq = {
          sourceLang,
          targetLang,
          jobGuid,
          updatedAt: (l10nmonster.regression ? /* @__PURE__ */ new Date("2022-05-30T00:00:00.000Z") : /* @__PURE__ */ new Date()).toISOString(),
          status: "created",
          tus: []
        };
        const jobRes = {
          ...jobReq,
          translationProvider: "TMExport",
          status: "done",
          tus: []
        };
        for (const tu of tus) {
          try {
            jobReq.tus.push(l10nmonster.TU.asSource(tu));
          } catch (e) {
            l10nmonster.logger.info(e.stack ?? e);
          }
          if (tu.inflight) {
            l10nmonster.logger.info(`Warning: in-flight translation unit ${tu.guid} can't be exported`);
          } else {
            try {
              jobRes.tus.push(l10nmonster.TU.asTarget(tu));
            } catch (e) {
              l10nmonster.logger.info(e.stack ?? e);
            }
          }
        }
        const filename = `TMExport_${sourceLang}_${targetLang}_job_${jobGuid}`;
        await fs.writeFile(`${filename}-req.json`, JSON.stringify(jobReq, null, "	"), "utf8");
        await fs.writeFile(`${filename}-done.json`, JSON.stringify(jobRes, null, "	"), "utf8");
        files.push(filename);
      }
    }
    console.log(`Generated files: ${files.join(", ")}`);
  }
};
__publicField(tmexport, "help", {
  description: "export translation memory as a json job.",
  options: [
    ["-l, --lang <language>", "target language to export"],
    ["--filter <filter>", "use the specified tu filter"],
    ["--prjsplit", "split target files by project"]
  ]
});

// translate.js
function computeDelta(currentTranslations, newTranslations) {
  const delta = [];
  const newGstrMap = Object.fromEntries(newTranslations.segments.map((seg) => [seg.sid, seg.gstr]));
  const seenIds = /* @__PURE__ */ new Set();
  for (const seg of currentTranslations.segments) {
    seenIds.add(seg.sid);
    const newGstr = newGstrMap[seg.sid];
    if (seg.gstr !== newGstr) {
      delta.push({ id: seg.sid, l: seg.gstr, r: newGstr });
    }
  }
  newTranslations.segments.filter((seg) => !seenIds.has(seg.sid)).forEach((seg) => delta.push({ id: seg.sid, r: seg.gstr }));
  return delta;
}
async function compareToExisting(monsterManager, resHandle, targetLang, translatedRes) {
  let currentTranslations;
  let delta;
  const channel = monsterManager.rm.getChannel(resHandle.channel);
  try {
    currentTranslations = await channel.getExistingTranslatedResource(resHandle, targetLang);
    if (translatedRes) {
      const newTranslations = await channel.makeResourceHandleFromObject(resHandle).loadResourceFromRaw(translatedRes, { isSource: false });
      delta = computeDelta(currentTranslations, newTranslations);
    }
  } catch (e) {
    l10nmonster.logger.verbose(`Couldn't fetch ${targetLang} resource for ${resHandle.channel}:${resHandle.id}: ${e.stack ?? e}`);
  }
  const bundleChanges = currentTranslations ? translatedRes ? delta.length > 0 ? "changed" : "unchanged" : "deleted" : translatedRes ? "new" : "void";
  return [bundleChanges, delta];
}
function printChanges(resHandle, targetLang, bundleChanges, delta) {
  if (bundleChanges === "changed") {
    console.log(`
${consoleColor.yellow}Changed translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}${consoleColor.reset}`);
    for (const change of delta) {
      change.l !== void 0 && console.log(`${consoleColor.red}- ${change.id}: ${change.l}${consoleColor.reset}`);
      change.r !== void 0 && console.log(`${consoleColor.green}+ ${change.id}: ${change.r}${consoleColor.reset}`);
    }
  } else if (bundleChanges === "new") {
    console.log(`
${consoleColor.green}New translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}${consoleColor.reset}`);
  } else if (bundleChanges === "deleted") {
    console.log(`
${consoleColor.green}Deleted translated bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}${consoleColor.reset}`);
  }
}
function printSummary(response) {
  console.log("Translation summary:");
  for (const [lang, langStatus] of Object.entries(response.lang)) {
    const summary = {};
    for (const resourceStatus of langStatus.resourceStatus) {
      summary[resourceStatus.status] = (summary[resourceStatus.status] ?? 0) + 1;
    }
    console.log(`  - ${lang}: ${Object.entries(summary).sort().map(([k, v]) => `${k}(${v})`).join(", ")}`);
  }
}
var translate = class {
  static async action(monsterManager, options) {
    const mode = (options.mode ?? "all").toLowerCase();
    console.log(`Generating translated resources for ${consoleColor.bright}${options.lang ? options.lang : "all languages"}${consoleColor.reset}... (${mode} mode)`);
    const response = { lang: {} };
    const targetLangs = monsterManager.getTargetLangs(options.lang);
    const allResources = await monsterManager.rm.getAllResources({ keepRaw: true });
    for await (const resHandle of allResources) {
      for (const targetLang of targetLangs) {
        if (resHandle.targetLangs.includes(targetLang) && (l10nmonster.prj === void 0 || l10nmonster.prj.includes(resHandle.prj))) {
          const resourceStatus = { id: resHandle.id };
          const tm = await monsterManager.tmm.getTM(resHandle.sourceLang, targetLang);
          const translatedRes = await resHandle.generateTranslatedRawResource(tm);
          let bundleChanges, delta;
          if (mode === "delta" || mode === "dryrun") {
            [bundleChanges, delta] = await compareToExisting(monsterManager, resHandle, targetLang, translatedRes);
            resourceStatus.status = bundleChanges;
            resourceStatus.delta = delta;
          }
          if (mode === "dryrun") {
            printChanges(resHandle, targetLang, bundleChanges, delta);
          } else if (mode === "all" || bundleChanges === "changed" || bundleChanges === "new" || bundleChanges === "deleted") {
            const translatedResourceId = await monsterManager.rm.getChannel(resHandle.channel).commitTranslatedResource(targetLang, resHandle.id, translatedRes);
            resourceStatus.status = translatedRes === null ? "deleted" : "generated";
            resourceStatus.translatedId = translatedResourceId;
            l10nmonster.logger.verbose(`Committed translated resource: ${translatedResourceId}`);
          } else {
            l10nmonster.logger.verbose(`Delta mode skipped translation of bundle ${resHandle.channel}:${resHandle.id} for ${targetLang}`);
            resourceStatus.status = "skipped";
          }
          response.lang[targetLang] ??= { resourceStatus: [] };
          response.lang[targetLang].resourceStatus.push(resourceStatus);
        }
      }
    }
    printSummary(response);
    return response;
  }
};
__publicField(translate, "help", {
  description: "generate translated resources based on latest source and translations.",
  arguments: [
    ["[mode]", "commit all/changed/none of the translations", ["all", "delta", "dryrun"]]
  ],
  options: [
    ["-l, --lang <language>", "target language to translate"]
  ]
});

// l10nCommands.js
function createLogger2(verboseOption) {
  const verboseLevel = verboseOption === void 0 || verboseOption === 0 ? "error" : (
    // eslint-disable-next-line no-nested-ternary
    verboseOption === 1 ? "warn" : verboseOption === true || verboseOption === 2 ? "info" : "verbose"
  );
  return winston.createLogger({
    level: verboseLevel,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.ms(),
          winston.format.timestamp(),
          winston.format.printf(({ level, message, timestamp, ms }) => `${consoleColor.green}${timestamp.substr(11, 12)} (${ms}) [${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB] ${level}: ${typeof message === "string" ? message : util.inspect(message)}${consoleColor.reset}`)
        )
      })
    ]
  });
}
function createHandler(mm, globalOptions, action) {
  return (opts) => action(mm, { ...globalOptions, ...opts });
}
var builtInCmds = [analyze, job, jobs, monster, pull, push, snap, status, tmexport, translate];
async function runL10nMonster(relativePath, globalOptions, cb) {
  const configPath = path.resolve(".", relativePath);
  global.l10nmonster ??= {};
  l10nmonster.logger = createLogger2(globalOptions.verbose);
  l10nmonster.env = process.env;
  const mm = await (0, import_core8.createMonsterManager)(configPath, globalOptions);
  const l10n = {
    withMonsterManager: (cb2) => cb2(mm)
  };
  [...builtInCmds, ...mm.extensionCmds].forEach((Cmd) => l10n[Cmd.name] = createHandler(mm, globalOptions, Cmd.action));
  let response;
  try {
    response = await cb(l10n);
  } catch (e) {
    response = { error: e.stack ?? e };
  } finally {
    mm && await mm.shutdown();
  }
  if (response?.error) {
    throw response.error;
  }
  return response;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  builtInCmds,
  runL10nMonster
});
//# sourceMappingURL=l10nCommands.cjs.map
