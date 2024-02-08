var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// ../node_modules/words-count/dist/index.js
var require_dist = __commonJS({
  "../node_modules/words-count/dist/index.js"(exports, module2) {
    !function(e, t) {
      "object" == typeof exports && "object" == typeof module2 ? module2.exports = t() : "function" == typeof define && define.amd ? define("words-count", [], t) : "object" == typeof exports ? exports["words-count"] = t() : e["words-count"] = t();
    }(exports, function() {
      return (() => {
        "use strict";
        var e = { 314: (e2, t2, r2) => {
          r2.r(t2), r2.d(t2, { default: () => a, wordsCount: () => c, wordsSplit: () => i, wordsDetect: () => u });
          var o = [",", "\uFF0C", ".", "\u3002", ":", "\uFF1A", ";", "\uFF1B", "[", "]", "\u3010", "]", "\u3011", "{", "\uFF5B", "}", "\uFF5D", "(", "\uFF08", ")", "\uFF09", "<", "\u300A", ">", "\u300B", "$", "\uFFE5", "!", "\uFF01", "?", "\uFF1F", "~", "\uFF5E", "'", "\u2019", '"', "\u201C", "\u201D", "*", "/", "\\", "&", "%", "@", "#", "^", "\u3001", "\u3001", "\u3001", "\u3001"], n = { words: [], count: 0 }, u = function(e3) {
            var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
            if (!e3)
              return n;
            var r3 = String(e3);
            if ("" === r3.trim())
              return n;
            var u2 = t3.punctuationAsBreaker ? " " : "", c2 = t3.disableDefaultPunctuation ? [] : o, i2 = t3.punctuation || [], a2 = c2.concat(i2);
            a2.forEach(function(e4) {
              var t4 = new RegExp("\\" + e4, "g");
              r3 = r3.replace(t4, u2);
            }), r3 = (r3 = (r3 = (r3 = r3.replace(/[\uFF00-\uFFEF\u2000-\u206F]/g, "")).replace(/\s+/, " ")).split(" ")).filter(function(e4) {
              return e4.trim();
            });
            var d = "(\\d+)|[a-zA-Z\xC0-\xFF\u0100-\u017F\u0180-\u024F\u0250-\u02AF\u1E00-\u1EFF\u0400-\u04FF\u0500-\u052F\u0D00-\u0D7F]+|", f = "\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u31C0-\u31EF\u3200-\u32FF\u3300-\u33FF\u3400-\u3FFF\u4000-\u4DBF\u4E00-\u4FFF\u5000-\u5FFF\u6000-\u6FFF\u7000-\u7FFF\u8000-\u8FFF\u9000-\u9FFF\uF900-\uFAFF", p = "\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3190-\u319F", s = "\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uAFFF\uB000-\uBFFF\uC000-\uCFFF\uD000-\uD7AF\uD7B0-\uD7FF", l = new RegExp(d + "[" + f + p + s + "]", "g"), v = [];
            return r3.forEach(function(e4) {
              var t4, r4 = [];
              do {
                (t4 = l.exec(e4)) && r4.push(t4[0]);
              } while (t4);
              0 === r4.length ? v.push(e4) : v = v.concat(r4);
            }), { words: v, count: v.length };
          }, c = function(e3) {
            var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, r3 = u(e3, t3), o2 = r3.count;
            return o2;
          }, i = function(e3) {
            var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, r3 = u(e3, t3), o2 = r3.words;
            return o2;
          };
          const a = c;
        } }, t = {};
        function r(o) {
          if (t[o])
            return t[o].exports;
          var n = t[o] = { exports: {} };
          return e[o](n, n.exports, r), n.exports;
        }
        return r.d = (e2, t2) => {
          for (var o in t2)
            r.o(t2, o) && !r.o(e2, o) && Object.defineProperty(e2, o, { enumerable: true, get: t2[o] });
        }, r.o = (e2, t2) => Object.prototype.hasOwnProperty.call(e2, t2), r.r = (e2) => {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e2, "__esModule", { value: true });
        }, r(314);
      })();
    });
  }
});

// src/index.js
var src_exports = {};
__export(src_exports, {
  MonsterManager: () => MonsterManager,
  OpsMgr: () => OpsMgr,
  analyzeCmd: () => analyzeCmd,
  createMonsterManager: () => createMonsterManager,
  jobPushCmd: () => jobPushCmd,
  jobsCmd: () => jobsCmd,
  pullCmd: () => pullCmd,
  pushCmd: () => pushCmd,
  snapCmd: () => snapCmd,
  statusCmd: () => statusCmd
});
module.exports = __toCommonJS(src_exports);

// src/monsterManager.js
var import_words_count = __toESM(require_dist(), 1);

// src/tmManager.js
var path = __toESM(require("path"), 1);
var import_fs = require("fs");
var import_helpers = require("@l10nmonster/helpers");
var TM = class {
  #tmPathName;
  #lookUpByFlattenSrc = {};
  #jobStatus;
  #tus;
  #isDirty = false;
  constructor(sourceLang, targetLang, tmPathName, configSeal, jobs) {
    this.#tmPathName = tmPathName;
    this.sourceLang = sourceLang;
    this.targetLang = targetLang;
    this.configSeal = configSeal;
    this.#jobStatus = {};
    this.#tus = {};
    if ((0, import_fs.existsSync)(tmPathName)) {
      const tmData = JSON.parse((0, import_fs.readFileSync)(tmPathName, "utf8"));
      const jobMap = Object.fromEntries(jobs);
      const extraJobs = Object.keys(tmData?.jobStatus ?? {}).filter((jobGuid) => !jobMap[jobGuid]);
      if (!(tmData?.configSeal === configSeal) || extraJobs.length > 0) {
        this.#jobStatus = {};
        this.#tus = {};
        l10nmonster.logger.info(`Nuking existing TM ${tmPathName}`);
      } else {
        this.#jobStatus = tmData.jobStatus;
        Object.values(tmData.tus).forEach((tu) => this.setEntry(tu));
      }
    }
  }
  get guids() {
    return Object.keys(this.#tus);
  }
  getEntryByGuid(guid) {
    return this.#tus[guid];
  }
  setEntry(entry) {
    try {
      const cleanedTU = l10nmonster.TU.asPair(entry);
      Object.freeze(cleanedTU);
      this.#tus[entry.guid] = cleanedTU;
      const flattenSrc = import_helpers.utils.flattenNormalizedSourceToOrdinal(cleanedTU.nsrc);
      this.#lookUpByFlattenSrc[flattenSrc] ??= [];
      !this.#lookUpByFlattenSrc[flattenSrc].includes(cleanedTU) && this.#lookUpByFlattenSrc[flattenSrc].push(cleanedTU);
    } catch (e) {
      l10nmonster.logger.verbose(`Not setting TM entry: ${e}`);
    }
  }
  getAllEntriesBySrc(src) {
    const flattenedSrc = import_helpers.utils.flattenNormalizedSourceToOrdinal(src);
    return this.#lookUpByFlattenSrc[flattenedSrc] || [];
  }
  // get status of job in the TM (if it exists)
  getJobStatus(jobGuid) {
    const jobMeta = this.#jobStatus[jobGuid];
    return [jobMeta?.status, jobMeta?.updatedAt];
  }
  async commit() {
    if (this.#isDirty) {
      l10nmonster.logger.info(`Updating ${this.#tmPathName}...`);
      const tmData = { ...this, jobStatus: this.#jobStatus, tus: this.#tus };
      (0, import_fs.writeFileSync)(this.#tmPathName, JSON.stringify(tmData, null, "	"), "utf8");
    }
  }
  async processJob(jobResponse, jobRequest) {
    this.#isDirty = true;
    const requestedUnits = {};
    jobRequest?.tus && jobRequest.tus.forEach((tu) => requestedUnits[tu.guid] = tu);
    const { jobGuid, status, inflight, tus, updatedAt, translationProvider } = jobResponse;
    if (inflight) {
      for (const guid of inflight) {
        const reqEntry = requestedUnits[guid] ?? {};
        const tmEntry = this.getEntryByGuid(guid);
        if (!tmEntry) {
          this.setEntry({ ...reqEntry, q: 0, jobGuid, inflight: true });
        }
      }
    }
    if (tus) {
      for (const tu of tus) {
        const tmEntry = this.getEntryByGuid(tu.guid);
        const reqEntry = requestedUnits[tu.guid] ?? {};
        const rectifiedTU = { ...reqEntry, ...tu, jobGuid, translationProvider };
        if (!tmEntry || tmEntry.q < tu.q || tmEntry.q === tu.q && tmEntry.ts < rectifiedTU.ts) {
          this.setEntry(rectifiedTU);
        }
      }
    }
    this.#jobStatus[jobGuid] = { status, updatedAt, translationProvider, units: tus?.length ?? inflight?.length ?? 0 };
  }
  getJobsMeta() {
    return this.#jobStatus;
  }
};
var TMManager = class {
  constructor({ monsterDir, jobStore, configSeal, parallelism }) {
    this.monsterDir = monsterDir;
    this.jobStore = jobStore;
    this.configSeal = configSeal;
    this.tmCache = /* @__PURE__ */ new Map();
    this.generation = (/* @__PURE__ */ new Date()).getTime();
    this.parallelism = parallelism ?? 8;
  }
  async getTM(sourceLang, targetLang) {
    const tmFileName = `tmCache_${sourceLang}_${targetLang}.json`;
    let tm = this.tmCache.get(tmFileName);
    if (tm) {
      return tm;
    }
    const jobs = (await this.jobStore.getJobStatusByLangPair(sourceLang, targetLang)).filter((e) => ["pending", "done"].includes(e[1].status));
    if (!tm) {
      tm = new TM(sourceLang, targetLang, path.join(this.monsterDir, tmFileName), this.configSeal, jobs);
      this.tmCache.set(tmFileName, tm);
    }
    const jobsToFetch = [];
    for (const [jobGuid, handle] of jobs) {
      const [status, updatedAt] = tm.getJobStatus(jobGuid);
      if (status !== handle.status) {
        jobsToFetch.push({
          jobHandle: handle[handle.status],
          jobRequestHandle: handle.req,
          tmUpdatedAt: updatedAt
        });
      }
    }
    while (jobsToFetch.length > 0) {
      const jobPromises = jobsToFetch.splice(0, this.parallelism).map((meta) => (async () => {
        const body = await this.jobStore.getJobByHandle(meta.jobHandle);
        return { meta, body };
      })());
      const fetchedJobs = await Promise.all(jobPromises);
      l10nmonster.logger.verbose(`Fetched chunk of ${jobsToFetch.length} jobs`);
      const jobsRequestsToFetch = [];
      for (const job of fetchedJobs) {
        if (job.body.updatedAt !== job.meta.tmUpdatedAt) {
          jobsRequestsToFetch.push({
            jobRequestHandle: job.meta.jobRequestHandle,
            jobResponse: job.body
          });
        }
      }
      if (jobsRequestsToFetch.length > 0) {
        const jobPromises2 = jobsRequestsToFetch.map((meta) => (async () => {
          const jobRequest = await this.jobStore.getJobRequestByHandle(meta.jobRequestHandle);
          return { jobResponse: meta.jobResponse, jobRequest };
        })());
        for (const { jobResponse, jobRequest } of await Promise.all(jobPromises2)) {
          l10nmonster.logger.info(`Applying job ${jobResponse?.jobGuid} to the ${sourceLang} -> ${targetLang} TM...`);
          await tm.processJob(jobResponse, jobRequest);
        }
      }
    }
    return tm;
  }
  async shutdown() {
    for (const tm of this.tmCache.values()) {
      await tm.commit();
    }
  }
};

// src/entities/resourceHandle.js
var ResourceHandle = class {
  #formatHandler;
  constructor({ id, channel, modified, resourceFormat, formatHandler, sourceLang, targetLangs, prj, raw, segments, subresources, ...other }) {
    this.id = id;
    this.channel = channel;
    this.modified = modified;
    this.resourceFormat = resourceFormat;
    this.#formatHandler = formatHandler;
    this.sourceLang = sourceLang;
    this.targetLangs = targetLangs;
    this.prj = prj;
    this.raw = raw;
    this.segments = segments;
    this.subresources = subresources;
    if (Object.keys(other).length > 1) {
      l10nmonster.logger.verbose(`Unknown properties in resource handle: ${Object.keys(other).join(", ")}`);
    }
  }
  loadFromNormalizedResource(normalizedResource) {
    const { segments, subresources } = normalizedResource;
    this.segments = segments;
    this.subresources = subresources;
    return this;
  }
  async loadResourceFromRaw(rawResource, { isSource, keepRaw } = {}) {
    const normalizedResource = await this.#formatHandler.getNormalizedResource(this.id, rawResource, isSource);
    keepRaw && (this.raw = rawResource);
    return this.loadFromNormalizedResource(normalizedResource);
  }
  async generateTranslatedRawResource(tm) {
    return this.#formatHandler.generateTranslatedResource(this, tm);
  }
};

// src/entities/channel.js
var Channel = class {
  #id;
  #source;
  #formatHandlers;
  #defaultResourceFormat;
  #defaultSourceLang;
  #defaultTargetLangs;
  #target;
  constructor({ id, source, formatHandlers, defaultResourceFormat, defaultSourceLang, defaultTargetLangs, target }) {
    this.#id = id;
    this.#source = source;
    this.#formatHandlers = formatHandlers;
    this.#defaultResourceFormat = defaultResourceFormat;
    this.#defaultSourceLang = defaultSourceLang;
    this.#defaultTargetLangs = defaultTargetLangs;
    this.#target = target;
  }
  makeResourceHandleFromObject(obj) {
    const resourceFormat = obj.resourceFormat ?? this.#defaultResourceFormat;
    const formatHandler = this.#formatHandlers[resourceFormat];
    return new ResourceHandle({
      channel: this.#id,
      resourceFormat: this.#defaultResourceFormat,
      formatHandler,
      sourceLang: this.#defaultSourceLang,
      // can be overriden but here's the default
      targetLangs: this.#defaultTargetLangs,
      ...obj
    });
  }
  async getResourceHandles() {
    const resStats = await this.#source.fetchResourceStats();
    l10nmonster.logger.verbose(`Fetched resource handles for channel ${this.#id}`);
    return resStats.map((rs) => this.makeResourceHandleFromObject(rs));
  }
  async *getAllNormalizedResources({ keepRaw } = {}) {
    if (this.#source.fetchAllResources) {
      for await (const [resourceStat, rawResource] of this.#source.fetchAllResources(l10nmonster.prj)) {
        const handle = this.makeResourceHandleFromObject(resourceStat);
        yield handle.loadResourceFromRaw(rawResource, { isSource: true, keepRaw });
      }
    } else {
      const resourceStats = await this.#source.fetchResourceStats();
      for (const resourceStat of resourceStats) {
        if (l10nmonster.prj === void 0 || l10nmonster.prj.includes(resourceStat.prj)) {
          const handle = this.makeResourceHandleFromObject(resourceStat);
          const rawResource = await this.#source.fetchResource(resourceStat.id);
          yield handle.loadResourceFromRaw(rawResource, { isSource: true, keepRaw });
        }
      }
    }
  }
  async loadResource(resourceHandle, { keepRaw } = {}) {
    const rawResource = await this.#source.fetchResource(resourceHandle.id);
    return resourceHandle.loadResourceFromRaw(rawResource, { isSource: true, keepRaw });
  }
  async getExistingTranslatedResource(resourceHandle, targetLang, { keepRaw } = {}) {
    const rawResource = await this.#target.fetchTranslatedResource(targetLang, resourceHandle.id);
    const translatedResource = this.makeResourceHandleFromObject(resourceHandle);
    return translatedResource.loadResourceFromRaw(rawResource, { isSource: false, keepRaw });
  }
  async commitTranslatedResource(targetLang, resourceId, rawResource) {
    const translatedResourceId = this.#target.translatedResourceId(targetLang, resourceId);
    await this.#target.commitTranslatedResource(targetLang, resourceId, rawResource);
    return translatedResourceId;
  }
};

// src/entities/normalizer.js
var import_helpers2 = require("@l10nmonster/helpers");
var Normalizer = class {
  #decoders;
  #textEncoders;
  #codeEncoders;
  constructor({ decoders, textEncoders, codeEncoders, joiner }) {
    this.#decoders = decoders;
    this.#textEncoders = textEncoders;
    this.#codeEncoders = codeEncoders ?? [import_helpers2.normalizers.defaultCodeEncoder];
    this.join = joiner ?? ((parts) => parts.join(""));
  }
  decode(str, flags = {}) {
    return import_helpers2.utils.getNormalizedString(str, this.#decoders, flags);
  }
  encodePart(part, flags) {
    const encoders = typeof part === "string" ? this.#textEncoders : this.#codeEncoders;
    if (encoders) {
      return encoders.reduce((s, encoder) => encoder(s, flags), part);
    } else {
      return part;
    }
  }
};

// src/entities/formatHandler.js
var import_helpers3 = require("@l10nmonster/helpers");
var FormatHandler = class {
  #id;
  #resourceFilter;
  #normalizers;
  #defaultMessageFormat;
  #segmentDecorators;
  #formatHandlers;
  constructor({ id, resourceFilter, normalizers: normalizers2, defaultMessageFormat, segmentDecorators, formatHandlers }) {
    if (!resourceFilter) {
      throw `Missing resource filter for format ${this.#id}`;
    }
    this.#id = id;
    this.#resourceFilter = resourceFilter;
    this.#normalizers = normalizers2;
    this.#defaultMessageFormat = defaultMessageFormat;
    this.#segmentDecorators = segmentDecorators;
    this.#formatHandlers = formatHandlers;
  }
  #populateGuid(rid, str, mf, base, flags = {}) {
    base.mf = mf;
    const normalizer = this.#normalizers[base.mf];
    if (!normalizer) {
      throw `Unknown message format ${mf} in format ${this.#id}`;
    }
    base.nstr = normalizer.decode(str, flags);
    const firedFlags = Object.entries(flags).filter((f) => f[1]).map((f) => f[0]);
    firedFlags.length > 0 && (base.flags = firedFlags);
    base.gstr = import_helpers3.utils.flattenNormalizedSourceToOrdinal(base.nstr);
    base.guid = import_helpers3.utils.generateGuid(`${rid}|${base.sid}|${base.gstr}`);
    return base;
  }
  #translateWithTMEntry(nsrc, entry) {
    if (entry && !entry.inflight) {
      if (import_helpers3.utils.sourceAndTargetAreCompatible(nsrc, entry.ntgt)) {
        const phMatcher = import_helpers3.utils.phMatcherMaker(nsrc);
        return entry.ntgt.map((part) => {
          if (typeof part === "string") {
            return part;
          } else {
            const ph = phMatcher(part);
            if (ph) {
              return ph;
            } else {
              throw `unknown placeholder found: ${JSON.stringify(part)}`;
            }
          }
        });
      } else {
        throw `source and target are incompatible
${JSON.stringify(nsrc)}
${JSON.stringify(entry.ntgt)}`;
      }
    } else {
      throw `TM entry missing or in flight`;
    }
  }
  #encodeTranslatedSegment(ntgt, mf, flags) {
    const normalizer = this.#normalizers[mf];
    if (!normalizer) {
      throw `Unknown message format ${mf} in format ${this.#id}`;
    }
    const encodedParts = ntgt.map((part, idx) => normalizer.encodePart(part, {
      ...flags,
      isFirst: idx === 0,
      isLast: idx === ntgt.length - 1
    }));
    return normalizer.join(encodedParts);
  }
  async getNormalizedResource(rid, resource, isSource) {
    let parsedRes = await this.#resourceFilter.parseResource({ resource, isSource });
    const normalizedSegments = [];
    const rawSegments = parsedRes.segments ?? [];
    for (const rawSegment of rawSegments.flat(1)) {
      const { str, notes, mf, ...normalizedSeg } = rawSegment;
      this.#populateGuid(rid, str, mf ?? this.#defaultMessageFormat, normalizedSeg);
      if (typeof notes === "string") {
        normalizedSeg.rawNotes = notes;
        normalizedSeg.notes = import_helpers3.utils.extractStructuredNotes(notes);
      }
      if (normalizedSeg.notes?.ph) {
        for (const part of normalizedSeg.nstr) {
          if (part.t === "x" && normalizedSeg.notes.ph[part.v]?.sample !== void 0 && part.s === void 0) {
            part.s = normalizedSeg.notes.ph[part.v].sample;
          }
        }
      }
      let decoratedSeg = normalizedSeg;
      if (this.#segmentDecorators) {
        for (const decorator of this.#segmentDecorators) {
          decoratedSeg = decorator(decoratedSeg);
          if (decoratedSeg === void 0) {
            l10nmonster.logger.verbose(`Decorator rejected segment ${normalizedSeg.sid} in resource ${rid}`);
            break;
          }
        }
      }
      if (decoratedSeg !== void 0) {
        Object.freeze(decoratedSeg);
        normalizedSegments.push(decoratedSeg);
      }
    }
    let subresources;
    if (parsedRes.subresources) {
      subresources = [];
      for (const subres of parsedRes.subresources) {
        const subFormat = this.#formatHandlers[subres.resourceFormat];
        const parsedSubres = await subFormat.getNormalizedResource(rid, subres.raw, true);
        if (parsedSubres.segments) {
          subres.guids = parsedSubres.segments.map((seg) => seg.guid);
          normalizedSegments.push(parsedSubres.segments);
          subresources.push(subres);
        }
      }
    }
    const segments = normalizedSegments.flat(1);
    Object.freeze(segments);
    return { segments, subresources };
  }
  async generateTranslatedResource(resHandle, tm) {
    const flags = { sourceLang: resHandle.sourceLang, targetLang: tm.targetLang, prj: resHandle.prj };
    if (this.#resourceFilter.generateResource) {
      const guidsToSkip = [];
      let subresources;
      if (resHandle.subresources) {
        subresources = [];
        for (const subres of resHandle.subresources) {
          const subFormat = this.#formatHandlers[subres.resourceFormat];
          if (!subFormat) {
            throw `Unknown resource format ${subres.resourceFormat} for subresource of ${this.#id}`;
          }
          const { id, guids, ...subresHandle } = subres;
          guidsToSkip.push(guids);
          const subresGuids = new Set(guids);
          const subresSegments = resHandle.segments.filter((seg) => subresGuids.has(seg.guid));
          const translatedSubres = await subFormat.generateTranslatedResource({
            ...resHandle,
            ...subresHandle,
            segment: subresSegments
          }, tm);
          translatedSubres !== void 0 && subresources.push({
            ...subresHandle,
            id,
            raw: translatedSubres
          });
        }
      }
      const translator2 = async (seg) => {
        const entry = tm.getEntryByGuid(seg.guid);
        try {
          const nstr = this.#translateWithTMEntry(seg.nstr, entry);
          if (nstr !== void 0) {
            const segmentFlags = Object.fromEntries((seg.flags ?? []).map((f) => [f, true]));
            const str = this.#encodeTranslatedSegment(nstr, seg.mf, { ...flags, ...segmentFlags });
            return { nstr, str };
          }
        } catch (e) {
          l10nmonster.logger.verbose(`Problem translating guid ${seg.guid} to ${tm.targetLang}: ${e.stack ?? e}`);
        }
      };
      return this.#resourceFilter.generateResource({ ...resHandle, translator: translator2, subresources });
    }
    const sourceLookup = Object.fromEntries(resHandle.segments.map((seg) => [seg.sid, seg]));
    const translator = async (sid, str) => {
      const segmentFlags = { ...flags };
      const normalizedSource = sourceLookup[sid];
      if (normalizedSource) {
        const segToTranslate = this.#populateGuid(resHandle.id, str, normalizedSource.mf, { sid }, segmentFlags);
        if (normalizedSource.guid !== segToTranslate.guid) {
          l10nmonster.logger.verbose(`Normalized source outdated: ${normalizedSource.gstr}
${segToTranslate.gstr}`);
          return void 0;
        }
        const entry = tm.getEntryByGuid(segToTranslate.guid);
        if (!entry) {
          return void 0;
        }
        try {
          const normalizedTranslation = this.#translateWithTMEntry(normalizedSource.nstr, entry);
          return this.#encodeTranslatedSegment(normalizedTranslation, normalizedSource.mf, segmentFlags);
        } catch (e) {
          l10nmonster.logger.verbose(`Problem translating ${resHandle.id}, ${sid}, ${str} to ${tm.targetLang}: ${e.stack ?? e}`);
          return void 0;
        }
      } else {
        l10nmonster.logger.verbose(`Dropping ${sid} in ${resHandle.id} as it's missing from normalized source`);
        return void 0;
      }
    };
    return this.#resourceFilter.translateResource({ resource: resHandle.raw, translator });
  }
};

// src/resourceManager.js
function validate(context, obj = {}) {
  const validators = {
    objectProperty: (...props) => {
      props.forEach((propName) => {
        if (obj[propName] !== void 0 && typeof obj[propName] !== "object") {
          throw `Property ${propName} of ${context} must be an object`;
        }
      });
      return validators;
    },
    arrayOfFunctions: (...props) => {
      props.forEach((propName) => {
        if (obj[propName] !== void 0) {
          if (!Array.isArray(obj[propName])) {
            throw `Property ${propName} of ${context} must be an array`;
          }
          obj[propName].forEach((coder, idx) => {
            if (typeof coder !== "function") {
              throw `Item at index ${idx} in property ${propName} of ${context} must be a function`;
            }
          });
        }
      });
      return validators;
    }
  };
  return validators;
}
var ResourceManager = class {
  // #configSeal;
  #channels = {};
  constructor({ channels, formats, snapStore, defaultSourceLang, defaultTargetLangs }) {
    const formatHandlers = {};
    for (const [format, formatCfg] of Object.entries(formats)) {
      validate(`format ${format}`, formatCfg).objectProperty("resourceFilter", "normalizers").arrayOfFunctions("segmentDecorators");
      const normalizers2 = {};
      for (const [normalizer, normalizerCfg] of Object.entries(formatCfg.normalizers)) {
        validate(`normalizer ${normalizer}`, normalizerCfg).arrayOfFunctions("decoders", "textEncoders", "codeEncoders");
        normalizers2[normalizer] = new Normalizer({
          id: normalizer,
          decoders: normalizerCfg.decoders,
          textEncoders: normalizerCfg.textEncoders,
          codeEncoders: normalizerCfg.codeEncoders,
          joiner: normalizerCfg.joiner
        });
      }
      formatHandlers[format] = new FormatHandler({
        id: format,
        resourceFilter: formatCfg.resourceFilter,
        normalizers: normalizers2,
        defaultMessageFormat: formatCfg.defaultMessageFormat ?? format,
        segmentDecorators: formatCfg.segmentDecorators,
        formatHandlers
        // passed in for sub-resources
      });
    }
    for (const [channelId, channelCfg] of Object.entries(channels)) {
      validate(`channel ${channelId}`, channelCfg).objectProperty("source", "target");
      this.#channels[channelId] = new Channel({
        id: channelId,
        source: channelCfg.source,
        formatHandlers,
        defaultResourceFormat: channelCfg.defaultResourceFormat ?? channelId,
        defaultSourceLang,
        defaultTargetLangs,
        target: channelCfg.target
      });
    }
    this.snapStore = snapStore;
  }
  /**
   * Returns a channel given its id.
   *
   * @param {string} channelId String identifier of the channel.
   * @return {Channel} A channel object.
   */
  getChannel(channelId) {
    const channel = this.#channels[channelId];
    if (!channel) {
      throw `Invalid channel reference: ${channelId}`;
    }
    return channel;
  }
  //
  // Snap store internal helpers
  //
  async #getResourceHandlesFromSnapStore() {
    const stats = await this.snapStore.getResourceStats();
    return stats.map((rs) => this.getChannel(rs.channel).makeResourceHandleFromObject(rs));
  }
  async *#getAllResourcesFromSnapStore(options) {
    l10nmonster.logger.info(`Getting all resources from snap store...`);
    const allResources = await this.snapStore.getAllResources(options);
    for await (const normalizedResource of allResources) {
      const handle = this.getChannel(normalizedResource.channel).makeResourceHandleFromObject(normalizedResource);
      yield handle.loadFromNormalizedResource(normalizedResource);
    }
  }
  //
  // Channel internal helpers
  //
  async #getResourceHandlesFromAllChannels() {
    l10nmonster.logger.info(`Getting resource stats from all sources...`);
    const combinedHandles = [];
    for (const channel of Object.values(this.#channels)) {
      const handles = await channel.getResourceHandles();
      combinedHandles.push(handles);
    }
    return combinedHandles.flat(1).filter((e) => l10nmonster.prj === void 0 || l10nmonster.prj.includes(e.prj));
  }
  async *#getAllResourcesFromSources(options) {
    l10nmonster.logger.info(`Getting all resources directly from sources...`);
    for (const channel of Object.values(this.#channels)) {
      const channelResources = await channel.getAllNormalizedResources(options);
      for await (const normalizedResource of channelResources) {
        yield normalizedResource;
      }
    }
  }
  //
  // Public API
  //
  async getResourceHandles() {
    return this.snapStore ? this.#getResourceHandlesFromSnapStore() : this.#getResourceHandlesFromAllChannels();
  }
  async *getAllResources(options = {}) {
    const ignoreSnapStore = options.ignoreSnapStore || options.keepRaw;
    return this.snapStore && !ignoreSnapStore ? yield* this.#getAllResourcesFromSnapStore(options) : yield* this.#getAllResourcesFromSources(options);
  }
  async getResource(resourceHandle, options = {}) {
    return this.snapStore ? resourceHandle.loadFromNormalizedResource(await this.snapStore.getResource(resourceHandle)) : this.getChannel(resourceHandle.channel).loadResource(resourceHandle, options);
  }
  async shutdown() {
  }
};

// src/monsterManager.js
var import_helpers4 = require("@l10nmonster/helpers");
var MonsterManager = class {
  #targetLangs;
  #targetLangSets = {};
  #functionsForShutdown;
  constructor({ monsterDir, monsterConfig, configSeal }) {
    if (!monsterConfig?.sourceLang) {
      throw "You must specify sourceLang in your config";
    }
    if (typeof monsterConfig?.targetLangs !== "object") {
      throw "You must specify a targetLangs object or array in your config";
    } else if (Array.isArray(monsterConfig.targetLangs)) {
      this.#targetLangs = new Set(monsterConfig.targetLangs);
    } else {
      this.#targetLangs = new Set(Object.values(monsterConfig.targetLangs).flat(1));
      this.#targetLangSets = monsterConfig.targetLangs;
    }
    if (!(monsterConfig?.jobStore ?? monsterConfig?.snapStore)) {
      throw "You must specify at least a jobStore or a snapStore in your config";
    }
    this.monsterDir = monsterDir;
    this.configSeal = configSeal;
    this.jobStore = monsterConfig.jobStore;
    this.jobStore.shutdown && this.scheduleForShutdown(this.jobStore.shutdown.bind(this.jobStore));
    this.sourceLang = monsterConfig.sourceLang;
    this.minimumQuality = monsterConfig.minimumQuality;
    this.#functionsForShutdown = [];
    let contentTypes;
    if (monsterConfig.contentTypes || monsterConfig.channels || monsterConfig.formats) {
      contentTypes = monsterConfig.contentTypes;
      ["source", "resourceFilter", "segmentDecorators", "decoders", "textEncoders", "codeEncoders", "joiner", "target"].forEach((propName) => {
        if (monsterConfig[propName] !== void 0) {
          throw `You can't specify ${propName} at the top level if you also use advance configurations`;
        }
      });
    } else {
      contentTypes = {
        default: {
          source: monsterConfig.source,
          resourceFilter: monsterConfig.resourceFilter,
          segmentDecorators: monsterConfig.segmentDecorators,
          decoders: monsterConfig.decoders,
          textEncoders: monsterConfig.textEncoders,
          codeEncoders: monsterConfig.codeEncoders,
          joiner: monsterConfig.joiner,
          target: monsterConfig.target
        }
      };
    }
    let channels, formats;
    if (contentTypes) {
      if (monsterConfig.channels || monsterConfig.formats) {
        throw `You can't specify channels/formats if you also use contentTypes`;
      }
      channels = {};
      formats = {};
      for (const [type, config] of Object.entries(contentTypes)) {
        channels[type] = {
          source: config.source,
          target: config.target,
          defaultResourceFormat: type
        };
        const normalizers2 = {};
        normalizers2[type] = {
          decoders: config.decoders,
          textEncoders: config.textEncoders,
          codeEncoders: config.codeEncoders,
          joiner: config.joiner
        };
        formats[type] = {
          resourceFilter: config.resourceFilter,
          normalizers: normalizers2,
          defaultMessageFormat: type,
          segmentDecorators: config.segmentDecorators
        };
      }
    } else {
      channels = monsterConfig.channels;
      formats = monsterConfig.formats;
    }
    this.rm = new ResourceManager({
      configSeal,
      channels,
      formats,
      snapStore: monsterConfig.snapStore,
      defaultSourceLang: monsterConfig.sourceLang,
      defaultTargetLangs: [...this.#targetLangs].sort()
    });
    this.scheduleForShutdown(this.rm.shutdown.bind(this.rm));
    if (monsterConfig.translationProviders) {
      this.translationProviders = monsterConfig.translationProviders;
    } else {
      this.translationProviders = {};
      monsterConfig.translationProvider && (this.translationProviders[monsterConfig.translationProvider.constructor.name] = {
        translator: monsterConfig.translationProvider
      });
    }
    this.tuFilters = monsterConfig.tuFilters;
    this.tmm = new TMManager({ monsterDir, jobStore: this.jobStore, configSeal });
    this.scheduleForShutdown(this.tmm.shutdown.bind(this.tmm));
    this.analyzers = monsterConfig.analyzers ?? {};
    this.capabilitiesByChannel = Object.fromEntries(Object.entries(channels).map(([type, channel]) => [type, {
      snap: Boolean(channel.source && monsterConfig.snapStore),
      status: Boolean(channel.source),
      push: Boolean(channel.source && Object.keys(this.translationProviders).length > 0),
      pull: Boolean(Object.keys(this.translationProviders).length > 0),
      translate: Boolean(channel.source && channel.target)
    }]));
    this.capabilities = Object.values(this.capabilitiesByChannel).reduce((p, c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (p[k] === void 0 ? true : p[k]) && v])), {});
    this.extensionCmds = monsterConfig.constructor.extensionCmds ?? [];
  }
  // register an async function to be called during shutdown
  scheduleForShutdown(func) {
    this.#functionsForShutdown.push(func);
  }
  // get all possible target languages from sources and from TMs
  getTargetLangs(limitToLang) {
    if (limitToLang) {
      const langsToLimit = Array.isArray(limitToLang) ? limitToLang : limitToLang.split(",");
      const targetLangs = [];
      for (const lang of langsToLimit) {
        const targetLangSet = import_helpers4.utils.fixCaseInsensitiveKey(this.#targetLangSets, lang);
        if (targetLangSet) {
          this.#targetLangSets[targetLangSet].forEach((lang2) => targetLangs.push(lang2));
        } else {
          targetLangs.push(lang);
        }
      }
      const invalidLangs = targetLangs.filter((limitedLang) => !this.#targetLangs.has(limitedLang));
      if (invalidLangs.length > 0) {
        throw `Invalid languages: ${invalidLangs.join(",")}`;
      }
      return targetLangs;
    }
    return [...this.#targetLangs];
  }
  getMinimumQuality(jobManifest) {
    let minimumQuality = this.minimumQuality;
    if (typeof minimumQuality === "function") {
      minimumQuality = minimumQuality(jobManifest);
    }
    if (minimumQuality === void 0) {
      throw "You must specify a minimum quality in your config";
    } else {
      return minimumQuality;
    }
  }
  // use cases:
  //   1 - both are passed as both are created at the same time -> may cancel if response is empty
  //   2 - only jobRequest is passed because it's blocked -> write if "blocked", cancel if "created"
  //   3 - only jobResponse is passed because it's pulled -> must write even if empty or it will show as blocked/pending
  async processJob(jobResponse, jobRequest) {
    if (jobRequest && jobResponse && !(jobResponse.tus?.length > 0 || jobResponse.inflight?.length > 0)) {
      jobResponse.status = "cancelled";
      return;
    }
    if (jobRequest && !jobResponse && jobRequest.status === "created") {
      jobRequest.status = "cancelled";
      return;
    }
    const tm = await this.tmm.getTM(jobResponse.sourceLang, jobResponse.targetLang);
    const updatedAt = (l10nmonster.regression ? /* @__PURE__ */ new Date("2022-05-29T00:00:00.000Z") : /* @__PURE__ */ new Date()).toISOString();
    if (jobRequest) {
      jobRequest.updatedAt = updatedAt;
      if (jobResponse) {
        const guidsInFlight = jobResponse.inflight ?? [];
        const translatedGuids = jobResponse?.tus?.map((tu) => tu.guid) ?? [];
        const acceptedGuids = new Set(guidsInFlight.concat(translatedGuids));
        jobRequest.tus = jobRequest.tus.filter((tu) => acceptedGuids.has(tu.guid));
      }
      jobRequest.tus = jobRequest.tus.map(l10nmonster.TU.asSource);
      await this.jobStore.writeJob(jobRequest);
    }
    if (jobResponse) {
      jobResponse.updatedAt = updatedAt;
      jobResponse.tus && (jobResponse.tus = jobResponse.tus.map(l10nmonster.TU.asTarget));
      await this.jobStore.writeJob(jobResponse);
    }
    await tm.processJob(jobResponse, jobRequest);
  }
  // eslint-disable-next-line complexity
  async #internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }) {
    const job = {
      sourceLang: this.sourceLang,
      targetLang,
      tus: []
    };
    minimumQuality ??= this.getMinimumQuality(job);
    const prjLeverage = {};
    const repetitionMap = {};
    let resourceCount = 0;
    for await (const resHandle of this.rm.getAllResources()) {
      resourceCount++;
      const prj = resHandle.prj || "default";
      prjLeverage[prj] ??= {
        translated: 0,
        translatedWords: 0,
        translatedByQ: {},
        untranslated: 0,
        untranslatedChars: 0,
        untranslatedWords: 0,
        pending: 0,
        pendingWords: 0,
        internalRepetitions: 0,
        internalRepetitionWords: 0
      };
      const leverageDetails = prjLeverage[prj];
      if (resHandle.targetLangs.includes(targetLang) && targetLang !== this.sourceLang) {
        const tm = await this.tmm.getTM(resHandle.sourceLang, targetLang);
        for (const seg of resHandle.segments) {
          const tmEntry = tm.getEntryByGuid(seg.guid);
          const tu = l10nmonster.TU.fromSegment(resHandle, seg);
          const plainText = tu.nsrc.map((e) => typeof e === "string" ? e : "").join("");
          const words = import_words_count.default.wordsCount(plainText);
          const isCompatible = import_helpers4.utils.sourceAndTargetAreCompatible(tu?.nsrc, tmEntry?.ntgt);
          if (!tmEntry || !tmEntry.inflight && (!isCompatible || tmEntry.q < minimumQuality)) {
            tm.getAllEntriesBySrc(tu.nsrc).filter((tu2) => tu2.q >= minimumQuality).length > 0 && (repetitionMap[seg.gstr] = true);
            if (repetitionMap[seg.gstr]) {
              leverageDetails.internalRepetitions++;
              leverageDetails.internalRepetitionWords += words;
              !leverage && job.tus.push(tu);
            } else {
              repetitionMap[seg.gstr] = true;
              job.tus.push(tu);
              leverageDetails.untranslated++;
              leverageDetails.untranslatedChars += plainText.length;
              leverageDetails.untranslatedWords += words;
            }
          } else {
            if (tmEntry.inflight) {
              leverageDetails.pending++;
              leverageDetails.pendingWords += words;
            } else {
              leverageDetails.translated ??= 0;
              leverageDetails.translated++;
              leverageDetails.translatedWords += words;
              leverageDetails.translatedByQ[tmEntry.q] ??= 0;
              leverageDetails.translatedByQ[tmEntry.q]++;
            }
          }
        }
      }
    }
    return [job, { minimumQuality, prjLeverage, numSources: resourceCount }];
  }
  async prepareTranslationJob({ targetLang, minimumQuality, leverage }) {
    return (await this.#internalPrepareTranslationJob({ targetLang, minimumQuality, leverage }))[0];
  }
  async estimateTranslationJob({ targetLang }) {
    return (await this.#internalPrepareTranslationJob({ targetLang }))[1];
  }
  async prepareFilterBasedJob({ targetLang, tmBased, guidList }) {
    const tm = await this.tmm.getTM(this.sourceLang, targetLang);
    const sourceLookup = {};
    for await (const res of this.rm.getAllResources()) {
      for (const seg of res.segments) {
        sourceLookup[seg.guid] = l10nmonster.TU.fromSegment(res, seg);
      }
    }
    if (!guidList) {
      if (tmBased) {
        guidList = tm.guids;
      } else {
        guidList = Object.keys(sourceLookup);
      }
    }
    let tus = guidList.map((guid) => {
      const sourceTU = sourceLookup[guid] ?? {};
      const translatedTU = tm.getEntryByGuid(guid) ?? {};
      return { ...sourceTU, ...translatedTU };
    });
    l10nmonster.prj !== void 0 && (tus = tus.filter((tu) => l10nmonster.prj.includes(tu.prj)));
    return {
      sourceLang: this.sourceLang,
      targetLang,
      tus
    };
  }
  getTranslationProvider(jobManifest) {
    if (jobManifest.translationProvider) {
      jobManifest.translationProvider = import_helpers4.utils.fixCaseInsensitiveKey(this.translationProviders, jobManifest.translationProvider);
    } else {
      for (const [name, providerCfg] of Object.entries(this.translationProviders)) {
        if (!providerCfg.pairs || providerCfg.pairs[jobManifest.sourceLang] && providerCfg.pairs[jobManifest.sourceLang].includes(jobManifest.targetLang)) {
          jobManifest.translationProvider = name;
          break;
        }
      }
    }
    return this.translationProviders[jobManifest.translationProvider];
  }
  async shutdown() {
    for (const func of this.#functionsForShutdown) {
      await func();
    }
  }
};

// src/opsMgr.js
var path2 = __toESM(require("path"), 1);
var import_fs2 = require("fs");
var fs = __toESM(require("fs"), 1);
var MAX_INLINE_OUTPUT = 16383;
var Task = class {
  constructor(opsMgr) {
    this.opsMgr = opsMgr;
    this.opList = [];
    this.context = {};
  }
  saveState() {
    if (this.opsMgr.opsDir) {
      const state = {
        taskName: this.taskName,
        rootOpId: this.rootOpId,
        context: this.context,
        opList: this.opList
      };
      const fullPath = path2.join(this.opsMgr.opsDir, `${this.taskName}-plan.json`);
      return fs.writeFileSync(fullPath, JSON.stringify(state, null, "	"), "utf8");
    }
  }
  setContext(context) {
    Object.freeze(context);
    this.context = context;
  }
  enqueue(opName, args, inputs) {
    inputs ??= [];
    const opId = this.opList.length;
    opName = typeof opName === "function" ? opName.name : opName;
    this.opList.push({ opId, opName, args, inputs, state: "pending" });
    return opId;
  }
  commit(opName, args, inputs) {
    this.rootOpId = this.enqueue(opName, args, inputs);
    this.taskName = `Task-${this.opList[this.rootOpId].opName}-${(/* @__PURE__ */ new Date()).getTime()}`;
    this.saveState();
    l10nmonster.logger.info(`${this.taskName} committed`);
  }
  addInputDependency(opId, input) {
    const op = this.opList[opId];
    op.inputs ??= [];
    if (!op.inputs.includes(input)) {
      op.inputs.push(input);
      op.state = "pending";
    }
  }
  getOutputByOpId(opId) {
    const out = this.opList[opId].output;
    if (typeof out === "boolean") {
      const fullPath = path2.join(this.opsMgr.opsDir, `${this.taskName}-out${opId}.json`);
      const outJSON = fs.readFileSync(fullPath, "utf8");
      return JSON.parse(outJSON);
    } else {
      return out;
    }
  }
  async execute() {
    let doneOps;
    let progress = 1;
    let errorMessage;
    while (progress > 0) {
      doneOps = 0;
      progress = 0;
      for (const op of this.opList) {
        if (op.state === "done") {
          doneOps++;
        } else if (!errorMessage) {
          const doneInputs = op.inputs.filter((id) => this.opList[id].state === "done");
          if (doneInputs.length === op.inputs.length) {
            try {
              const func = this.opsMgr.registry[op.opName].callback;
              if (!func) {
                throw `Op ${op.opName} not found in registry`;
              }
              const inputs = op.inputs.map(this.getOutputByOpId.bind(this));
              const boundFunc = func.bind(this);
              op.lastRanAt = (/* @__PURE__ */ new Date()).toISOString();
              l10nmonster.logger.info(`Executing opId: ${op.opId} opName: ${op.opName}...`);
              const response = await boundFunc(op.args, inputs) ?? null;
              const responseJSON = JSON.stringify(response, null, "	");
              if (responseJSON.length > MAX_INLINE_OUTPUT && this.opsMgr.opsDir) {
                const fullPath = path2.join(this.opsMgr.opsDir, `${this.taskName}-out${op.opId}.json`);
                fs.writeFileSync(fullPath, responseJSON, "utf8");
                op.output = true;
              } else {
                op.output = response;
              }
              op.state = "done";
            } catch (error) {
              errorMessage = error.stack ?? error;
              op.state = "error";
              op.output = errorMessage;
            }
            this.saveState();
            progress++;
          }
        }
      }
    }
    if (doneOps === this.opList.length) {
      return this.getOutputByOpId(this.rootOpId);
    } else {
      throw `OpsMgr: unable to execute task ${this.taskName} (${errorMessage})`;
    }
  }
  hydrate(filename) {
    if (this.opsMgr.opsDir) {
      const fullPath = path2.join(this.opsMgr.opsDir, filename);
      const state = JSON.parse(fs.readFileSync(fullPath));
      this.taskName = state.taskName;
      this.rootOpId = state.rootOpId;
      this.context = state.context;
      this.opList = state.opList;
    } else {
      throw "Can't hydrate if opsDir is not configured";
    }
  }
};
var OpsMgr = class {
  constructor(opsDir) {
    if (opsDir) {
      this.opsDir = opsDir;
      if (!(0, import_fs2.existsSync)(opsDir)) {
        (0, import_fs2.mkdirSync)(opsDir, { recursive: true });
      }
    }
    this.registry = {};
  }
  registerOp(func, options = {}) {
    options.opName ??= func.name;
    if (this.registry[options.opName]) {
      if (this.registry[options.opName].callback !== func) {
        throw `Op ${options.opName} already exists in registry`;
      }
    } else {
      options.callback = func;
      options.idempotent ??= false;
      this.registry[options.opName] = options;
    }
  }
  createTask() {
    return new Task(this);
  }
};

// src/commands/analyze.js
var import_helpers5 = require("@l10nmonster/helpers");
async function analyzeCmd(mm, analyzer, params, limitToLang, tuFilter) {
  const Analyzer = mm.analyzers[import_helpers5.utils.fixCaseInsensitiveKey(mm.analyzers, analyzer)];
  if (!Analyzer) {
    throw `couldn't find a ${analyzer} analyzer`;
  }
  let tuFilterFunction;
  if (tuFilter) {
    tuFilter = import_helpers5.utils.fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
    tuFilterFunction = mm.tuFilters[tuFilter];
    if (!tuFilterFunction) {
      throw `Couldn't find ${tuFilter} tu filter`;
    }
  }
  if (typeof Analyzer.prototype.processSegment === "function") {
    const analyzer2 = new Analyzer(...params);
    for await (const res of mm.rm.getAllResources()) {
      for (const seg of res.segments) {
        (!tuFilterFunction || tuFilterFunction(l10nmonster.TU.fromSegment(res, seg))) && analyzer2.processSegment({ rid: res.id, prj: res.prj, seg });
      }
    }
    return analyzer2.getAnalysis();
  } else if (typeof Analyzer.prototype.processTU === "function") {
    const bodies = [];
    let lastAnalysis;
    const hasAggregateAnalysis = typeof Analyzer.prototype.getAggregateAnalysis === "function";
    let analyzer2;
    const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
    const availableLangPairs = (await mm.jobStore.getAvailableLangPairs()).filter((pair) => desiredTargetLangs.has(pair[1]));
    for (const [sourceLang, targetLang] of availableLangPairs) {
      (!hasAggregateAnalysis || !analyzer2) && (analyzer2 = new Analyzer(...params));
      const tm = await mm.tmm.getTM(sourceLang, targetLang);
      const tus = tm.guids.map((guid) => tm.getEntryByGuid(guid));
      for (const tu of tus) {
        (!tuFilterFunction || tuFilterFunction(tu)) && analyzer2.processTU({ targetLang, tu });
      }
      !hasAggregateAnalysis && bodies.push((lastAnalysis = analyzer2.getAnalysis()).body);
    }
    return hasAggregateAnalysis ? analyzer2.getAggregateAnalysis() : { ...lastAnalysis, body: bodies.flat(1) };
  } else {
    throw `could not find processSegment or processTU function in analyzer`;
  }
}

// src/commands/pull.js
async function pullCmd(mm, { limitToLang, partial }) {
  const stats = { numPendingJobs: 0, translatedStrings: 0, doneJobs: 0, newPendingJobs: 0 };
  const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
  const availableLangPairs = (await mm.jobStore.getAvailableLangPairs()).filter((pair) => desiredTargetLangs.has(pair[1]));
  for (const [sourceLang, targetLang] of availableLangPairs) {
    const pendingJobs = (await mm.jobStore.getJobStatusByLangPair(sourceLang, targetLang)).filter((e) => e[1].status === "pending").map((e) => e[0]);
    stats.numPendingJobs += pendingJobs.length;
    for (const jobGuid of pendingJobs) {
      const jobRequest = await mm.jobStore.getJobRequest(jobGuid);
      const pendingJob = await mm.jobStore.getJob(jobGuid);
      if (pendingJob.status === "pending") {
        l10nmonster.logger.info(`Pulling job ${jobGuid}...`);
        const translationProvider = mm.getTranslationProvider(pendingJob);
        const jobResponse = await translationProvider.translator.fetchTranslations(pendingJob, jobRequest);
        if (jobResponse?.status === "done") {
          await mm.processJob(jobResponse, jobRequest);
          stats.translatedStrings += jobResponse.tus.length;
          stats.doneJobs++;
        } else if (jobResponse?.status === "pending") {
          l10nmonster.logger.info(`Got ${jobResponse.tus.length} translations for job ${jobRequest.jobGuid} but there are still ${jobResponse.inflight.length} translations in flight`);
          if (partial) {
            const { inflight, ...doneResponse } = jobResponse;
            doneResponse.status = "done";
            await mm.processJob(doneResponse, jobRequest);
            stats.translatedStrings += jobResponse.tus.length;
            const newRequest = await mm.jobStore.getJobRequest(jobResponse.jobGuid);
            const newManifest = await mm.jobStore.createJobManifest();
            const originalJobGuid = jobResponse.originalJobGuid ?? jobResponse.jobGuid;
            newRequest.originalJobGuid = originalJobGuid;
            newRequest.jobGuid = newManifest.jobGuid;
            newRequest.tus = newRequest.tus.filter((tu) => inflight.includes(tu.guid));
            const { tus, ...newResponse } = doneResponse;
            newResponse.originalJobGuid = originalJobGuid;
            newResponse.jobGuid = newManifest.jobGuid;
            newResponse.inflight = inflight;
            newResponse.status = "pending";
            await mm.processJob(newResponse, newRequest);
            stats.newPendingJobs++;
          }
        }
      }
    }
  }
  return stats;
}

// src/commands/snap.js
async function snapCmd(mm, { maxSegments } = {}) {
  if (mm.rm.snapStore) {
    maxSegments ??= 1e3;
    let resourceCount = 0;
    await mm.rm.snapStore.startSnapshot();
    const chunkNumber = {};
    let accumulatedSegments = 0;
    let accumulatedPrj;
    let accumulatedResources = {};
    for await (const res of mm.rm.getAllResources({ ignoreSnapStore: true })) {
      const currentPrj = res.prj ?? "default";
      chunkNumber[currentPrj] ??= 0;
      if (accumulatedPrj !== currentPrj || accumulatedSegments >= maxSegments) {
        if (Object.keys(accumulatedResources).length > 0) {
          await mm.rm.snapStore.commitResources(accumulatedPrj, chunkNumber[accumulatedPrj], accumulatedResources);
          chunkNumber[accumulatedPrj]++;
          accumulatedResources = {};
          accumulatedSegments = 0;
        }
        accumulatedPrj = currentPrj;
      }
      accumulatedResources[res.id] = res;
      accumulatedSegments += res.segments.length;
      resourceCount++;
    }
    if (Object.keys(accumulatedResources).length > 0) {
      await mm.rm.snapStore.commitResources(accumulatedPrj, chunkNumber[accumulatedPrj], accumulatedResources);
    }
    await mm.rm.snapStore.endSnapshot();
    return resourceCount;
  } else {
    throw `Snap store not configured`;
  }
}

// src/commands/push.js
var import_helpers6 = require("@l10nmonster/helpers");
async function pushCmd(mm, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions }) {
  let tuFilterFunction;
  if (tuFilter) {
    tuFilter = import_helpers6.utils.fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
    tuFilterFunction = mm.tuFilters[tuFilter];
    if (!tuFilterFunction) {
      throw `Couldn't find ${tuFilter} tu filter`;
    }
  }
  let guidList;
  if (driver.jobGuid) {
    const req = await mm.jobStore.getJobRequest(driver.jobGuid);
    if (!req) {
      throw `jobGuid ${driver.jobGuid} not found`;
    }
    guidList = req.tus.map((tu) => tu.guid);
  }
  const status = [];
  const targetLangs = mm.getTargetLangs(limitToLang);
  for (const targetLang of targetLangs) {
    const blockedJobs = (await mm.jobStore.getJobStatusByLangPair(mm.sourceLang, targetLang)).filter((e) => e[1].status === "req");
    if (blockedJobs.length === 0) {
      const jobBody = await (driver.untranslated ? mm.prepareTranslationJob({ targetLang, leverage }) : mm.prepareFilterBasedJob({ targetLang, tmBased: driver.tm, guidList }));
      tuFilterFunction && (jobBody.tus = jobBody.tus.filter((tu) => tuFilterFunction(tu)));
      const langStatus = { sourceLang: jobBody.sourceLang, targetLang };
      if (Object.keys(jobBody.tus).length > 0) {
        if (dryRun) {
          langStatus.tus = jobBody.tus;
        } else {
          jobBody.translationProvider = translationProviderName;
          const translationProvider = mm.getTranslationProvider(jobBody);
          langStatus.provider = jobBody.translationProvider;
          if (translationProvider) {
            const minimumJobSize = translationProvider.minimumJobSize ?? 0;
            if (jobBody.tus.length >= minimumJobSize || refresh) {
              const manifest = await mm.jobStore.createJobManifest();
              langStatus.jobGuid = manifest.jobGuid;
              const jobRequest = {
                ...jobBody,
                ...manifest
              };
              instructions && (jobRequest.instructions = instructions);
              const quota = translationProvider.quota ?? Number.MAX_VALUE;
              let jobResponse;
              if (jobBody.tus.length <= quota || refresh) {
                jobResponse = await (refresh ? translationProvider.translator.refreshTranslations(jobRequest) : translationProvider.translator.requestTranslations(jobRequest));
              } else {
                jobRequest.status = "blocked";
              }
              await mm.processJob(jobResponse, jobRequest);
              langStatus.status = jobResponse?.status ?? jobRequest.status;
              langStatus.num = jobResponse?.tus?.length ?? jobResponse?.inflight?.length ?? jobRequest?.tus?.length ?? 0;
            } else {
              langStatus.minimumJobSize = minimumJobSize;
              langStatus.num = jobBody?.tus?.length ?? 0;
            }
          } else {
            throw `No ${translationProviderName} translationProvider configured`;
          }
        }
        status.push(langStatus);
      }
    } else {
      throw `Can't push a job for language ${targetLang} if there are blocked/failed jobs outstanding`;
    }
  }
  return status;
}

// src/commands/job.js
async function jobPushCmd(mm, pushJobGuid) {
  const blockedRequest = await mm.jobStore.getJobRequest(pushJobGuid);
  if (blockedRequest.status === "blocked") {
    const translationProvider = mm.getTranslationProvider(blockedRequest);
    if (translationProvider) {
      const jobResponse = await translationProvider.translator.requestTranslations(blockedRequest);
      await mm.processJob(jobResponse, blockedRequest);
      return {
        status: jobResponse.status,
        num: jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0
      };
    } else {
      throw "No corresponding translationProvider configured";
    }
  } else {
    throw `Only blocked jobs can be submitted (current status is ${blockedRequest.status})`;
  }
}

// src/commands/status.js
async function statusCmd(mm, { limitToLang }) {
  const status = {
    lang: {},
    numSources: 0
  };
  const targetLangs = mm.getTargetLangs(limitToLang);
  for (const targetLang of targetLangs) {
    const leverage = await mm.estimateTranslationJob({ targetLang });
    status.lang[targetLang] = {
      leverage
    };
    status.numSources = leverage.numSources;
    l10nmonster.logger.info(`Calculated status of ${targetLang}`);
  }
  return status;
}

// src/commands/jobs.js
async function jobsCmd(mm, { limitToLang }) {
  const unfinishedJobs = {};
  const desiredTargetLangs = new Set(mm.getTargetLangs(limitToLang));
  const availableLangPairs = (await mm.jobStore.getAvailableLangPairs()).filter((pair) => desiredTargetLangs.has(pair[1]));
  for (const [sourceLang, targetLang] of availableLangPairs) {
    const pendingJobs = (await mm.jobStore.getJobStatusByLangPair(sourceLang, targetLang)).filter((e) => e[1].status !== "done");
    unfinishedJobs[targetLang] = [];
    for (const [jobGuid, handle] of pendingJobs) {
      unfinishedJobs[targetLang].push(await (handle.status === "pending" ? mm.jobStore.getJob(jobGuid) : mm.jobStore.getJobRequest(jobGuid)));
    }
  }
  return unfinishedJobs;
}

// src/monsterFactory.js
var path3 = __toESM(require("path"), 1);
var import_fs3 = require("fs");

// src/entities/tu.js
var import_helpers7 = require("@l10nmonster/helpers");
var sourceTUWhitelist = /* @__PURE__ */ new Set([
  // mandatory
  "guid",
  "rid",
  // this is for adding context to translation (also in case of refresh job from TM)
  "sid",
  // we need sid in the target so that we can qualify repetitions
  "nsrc",
  // we need this to support repetition leveraging (based on matching the source)
  // optional
  "prj",
  // this is primarily for filtering
  "notes",
  // this is for bug fixes
  "isSuffixPluralized",
  // TODO: change this from boolean to `pluralForm` enumeration (so it doesn't have to be a suffix)
  "nid",
  // opaque native id of the segment (in the original storage format)
  "seq"
  // sequence number to shorten guid
]);
var targetTUWhitelist = /* @__PURE__ */ new Set([
  // mandatory
  "guid",
  "ntgt",
  "inflight",
  "q",
  "ts",
  // timestamp. used to pick a winner among candidate TUs
  // optional
  "cost",
  "jobGuid",
  "translationProvider",
  "th",
  // this is used by TOS for a translation hash to detect bug fixes vendor-side
  "rev"
  // this is used by TOS to capture reviewed words and errors found
]);
var pairTUWhitelist = /* @__PURE__ */ new Set([...sourceTUWhitelist, ...targetTUWhitelist]);
function nstrHasV1Missing(nstr) {
  for (const part of nstr) {
    if (typeof part === "object" && !part.v1) {
      return true;
    }
  }
  return false;
}
function cleanupTU(entry) {
  const { src, tgt, ...cleanTU } = entry;
  cleanTU.nsrc === void 0 && src !== void 0 && (cleanTU.nsrc = [src]);
  cleanTU.ntgt === void 0 && tgt !== void 0 && (cleanTU.ntgt = [tgt]);
  if (cleanTU.nsrc && cleanTU.ntgt && nstrHasV1Missing(cleanTU.ntgt)) {
    const lookup = {};
    const sourcePhMap = import_helpers7.utils.flattenNormalizedSourceV1(cleanTU.nsrc)[1];
    Object.values(sourcePhMap).forEach((part) => (lookup[part.v] ??= []).push(part.v1));
    for (const part of cleanTU.ntgt) {
      if (typeof part === "object") {
        part.v1 = lookup[part.v].shift();
      }
    }
  }
  return cleanTU;
}
var TU = class _TU {
  constructor(entry, isSource, isTarget) {
    if (isSource && (!entry.guid || !entry.rid || !entry.sid || !Array.isArray(entry.nsrc))) {
      throw `Source TU must have guid, rid, sid, nsrc: ${JSON.stringify(entry)}`;
    }
    if (isTarget && (!entry.guid || !Number.isInteger(entry.q) || !Array.isArray(entry.ntgt) && !entry.inflight || !Number.isInteger(entry.ts))) {
      throw `Target TU must have guid, ntgt/inflight, q, ts: ${JSON.stringify(entry)}`;
    }
    const whitelist = isSource ? isTarget ? pairTUWhitelist : sourceTUWhitelist : targetTUWhitelist;
    for (const [k, v] of Object.entries(entry)) {
      if (whitelist.has(k)) {
        this[k] = v;
      }
    }
  }
  // returns a TU with only the source string and target missing
  static asSource(obj) {
    return new _TU(cleanupTU(obj), true, false);
  }
  // returns a TU with both source and target string
  static asTarget(obj) {
    return new _TU(cleanupTU(obj), false, true);
  }
  // returns a TU with both source and target string
  static asPair(obj) {
    return new _TU(cleanupTU(obj), true, true);
  }
  // converts a segments into a source TU
  static fromSegment(res, segment) {
    const { nstr, ...seg } = segment;
    const tu = {
      ...seg,
      nsrc: nstr,
      rid: res.id
    };
    if (res.prj !== void 0) {
      tu.prj = res.prj;
    }
    return _TU.asSource(tu);
  }
};

// src/monsterFactory.js
async function createMonsterManager(configPath, options) {
  if (!configPath) {
    throw "Cannot create l10n monster: missing configuration";
  }
  if (!l10nmonster.logger) {
    l10nmonster.logger = { verbose: () => false, info: () => false, warn: () => false, error: () => false };
  }
  if (!l10nmonster.env) {
    l10nmonster.env = {};
  }
  l10nmonster.baseDir = path3.dirname(configPath);
  l10nmonster.regression = options.regression;
  l10nmonster.prj = options.prj && options.prj.split(",");
  l10nmonster.arg = options.arg;
  l10nmonster.TU = TU;
  let Config;
  if (options.config) {
    Config = options.config;
    l10nmonster.logger.verbose(`Using provided config constructor ${Config}`);
  } else {
    l10nmonster.logger.verbose(`Requiring config from: ${configPath}`);
    Config = require(configPath);
  }
  if (typeof Config !== "function") {
    throw "Invalid Config. Need to export a class constructor as a CJS module.exports";
  }
  l10nmonster.opsMgr = Config.opsDir ? new OpsMgr(path3.join(l10nmonster.baseDir, Config.opsDir)) : new OpsMgr();
  try {
    const monsterConfig = new Config();
    const monsterDir = path3.join(l10nmonster.baseDir, monsterConfig.monsterDir ?? ".l10nmonster");
    l10nmonster.logger.verbose(`Monster cache dir: ${monsterDir}`);
    (0, import_fs3.mkdirSync)(monsterDir, { recursive: true });
    const configSeal = (0, import_fs3.statSync)(configPath).mtime.toISOString();
    const mm = new MonsterManager({ monsterDir, monsterConfig, configSeal });
    for (const tp of Object.values(mm.translationProviders)) {
      typeof tp.translator.init === "function" && await tp.translator.init(mm);
    }
    typeof monsterConfig.init === "function" && await monsterConfig.init(mm);
    l10nmonster.logger.verbose(`L10n Monster factory-initialized!`);
    return mm;
  } catch (e) {
    throw `l10nmonster.cjs failed to construct: ${e.stack || e}`;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MonsterManager,
  OpsMgr,
  analyzeCmd,
  createMonsterManager,
  jobPushCmd,
  jobsCmd,
  pullCmd,
  pushCmd,
  snapCmd,
  statusCmd
});
//# sourceMappingURL=index.cjs.map
