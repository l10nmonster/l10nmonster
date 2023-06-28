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

// node_modules/words-count/dist/index.js
var require_dist = __commonJS({
  "node_modules/words-count/dist/index.js"(exports, module2) {
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

// ../helpers/node_modules/merge2/index.js
var require_merge2 = __commonJS({
  "../helpers/node_modules/merge2/index.js"(exports, module2) {
    "use strict";
    var Stream = require("stream");
    var PassThrough = Stream.PassThrough;
    var slice = Array.prototype.slice;
    module2.exports = merge22;
    function merge22() {
      const streamsQueue = [];
      const args = slice.call(arguments);
      let merging = false;
      let options = args[args.length - 1];
      if (options && !Array.isArray(options) && options.pipe == null) {
        args.pop();
      } else {
        options = {};
      }
      const doEnd = options.end !== false;
      const doPipeError = options.pipeError === true;
      if (options.objectMode == null) {
        options.objectMode = true;
      }
      if (options.highWaterMark == null) {
        options.highWaterMark = 64 * 1024;
      }
      const mergedStream = PassThrough(options);
      function addStream() {
        for (let i = 0, len = arguments.length; i < len; i++) {
          streamsQueue.push(pauseStreams(arguments[i], options));
        }
        mergeStream();
        return this;
      }
      function mergeStream() {
        if (merging) {
          return;
        }
        merging = true;
        let streams = streamsQueue.shift();
        if (!streams) {
          process.nextTick(endStream);
          return;
        }
        if (!Array.isArray(streams)) {
          streams = [streams];
        }
        let pipesCount = streams.length + 1;
        function next() {
          if (--pipesCount > 0) {
            return;
          }
          merging = false;
          mergeStream();
        }
        function pipe(stream) {
          function onend() {
            stream.removeListener("merge2UnpipeEnd", onend);
            stream.removeListener("end", onend);
            if (doPipeError) {
              stream.removeListener("error", onerror);
            }
            next();
          }
          function onerror(err) {
            mergedStream.emit("error", err);
          }
          if (stream._readableState.endEmitted) {
            return next();
          }
          stream.on("merge2UnpipeEnd", onend);
          stream.on("end", onend);
          if (doPipeError) {
            stream.on("error", onerror);
          }
          stream.pipe(mergedStream, { end: false });
          stream.resume();
        }
        for (let i = 0; i < streams.length; i++) {
          pipe(streams[i]);
        }
        next();
      }
      function endStream() {
        merging = false;
        mergedStream.emit("queueDrain");
        if (doEnd) {
          mergedStream.end();
        }
      }
      mergedStream.setMaxListeners(0);
      mergedStream.add = addStream;
      mergedStream.on("unpipe", function(stream) {
        stream.emit("merge2UnpipeEnd");
      });
      if (args.length) {
        addStream.apply(null, args);
      }
      return mergedStream;
    }
    function pauseStreams(streams, options) {
      if (!Array.isArray(streams)) {
        if (!streams._readableState && streams.pipe) {
          streams = streams.pipe(PassThrough(options));
        }
        if (!streams._readableState || !streams.pause || !streams.pipe) {
          throw new Error("Only readable stream can be merged.");
        }
        streams.pause();
      } else {
        for (let i = 0, len = streams.length; i < len; i++) {
          streams[i] = pauseStreams(streams[i], options);
        }
      }
      return streams;
    }
  }
});

// ../helpers/node_modules/fast-glob/out/utils/array.js
var require_array = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/array.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.splitWhen = exports.flatten = void 0;
    function flatten(items) {
      return items.reduce((collection, item) => [].concat(collection, item), []);
    }
    exports.flatten = flatten;
    function splitWhen(items, predicate) {
      const result = [[]];
      let groupIndex = 0;
      for (const item of items) {
        if (predicate(item)) {
          groupIndex++;
          result[groupIndex] = [];
        } else {
          result[groupIndex].push(item);
        }
      }
      return result;
    }
    exports.splitWhen = splitWhen;
  }
});

// ../helpers/node_modules/fast-glob/out/utils/errno.js
var require_errno = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/errno.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isEnoentCodeError = void 0;
    function isEnoentCodeError(error) {
      return error.code === "ENOENT";
    }
    exports.isEnoentCodeError = isEnoentCodeError;
  }
});

// ../helpers/node_modules/fast-glob/out/utils/fs.js
var require_fs = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDirentFromStats = void 0;
    var DirentFromStats = class {
      constructor(name, stats) {
        this.name = name;
        this.isBlockDevice = stats.isBlockDevice.bind(stats);
        this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
        this.isDirectory = stats.isDirectory.bind(stats);
        this.isFIFO = stats.isFIFO.bind(stats);
        this.isFile = stats.isFile.bind(stats);
        this.isSocket = stats.isSocket.bind(stats);
        this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
      }
    };
    function createDirentFromStats(name, stats) {
      return new DirentFromStats(name, stats);
    }
    exports.createDirentFromStats = createDirentFromStats;
  }
});

// ../helpers/node_modules/fast-glob/out/utils/path.js
var require_path = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/path.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeLeadingDotSegment = exports.escape = exports.makeAbsolute = exports.unixify = void 0;
    var path5 = require("path");
    var LEADING_DOT_SEGMENT_CHARACTERS_COUNT = 2;
    var UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\())/g;
    function unixify(filepath) {
      return filepath.replace(/\\/g, "/");
    }
    exports.unixify = unixify;
    function makeAbsolute(cwd, filepath) {
      return path5.resolve(cwd, filepath);
    }
    exports.makeAbsolute = makeAbsolute;
    function escape(pattern) {
      return pattern.replace(UNESCAPED_GLOB_SYMBOLS_RE, "\\$2");
    }
    exports.escape = escape;
    function removeLeadingDotSegment(entry) {
      if (entry.charAt(0) === ".") {
        const secondCharactery = entry.charAt(1);
        if (secondCharactery === "/" || secondCharactery === "\\") {
          return entry.slice(LEADING_DOT_SEGMENT_CHARACTERS_COUNT);
        }
      }
      return entry;
    }
    exports.removeLeadingDotSegment = removeLeadingDotSegment;
  }
});

// ../helpers/node_modules/is-extglob/index.js
var require_is_extglob = __commonJS({
  "../helpers/node_modules/is-extglob/index.js"(exports, module2) {
    module2.exports = function isExtglob(str) {
      if (typeof str !== "string" || str === "") {
        return false;
      }
      var match;
      while (match = /(\\).|([@?!+*]\(.*\))/g.exec(str)) {
        if (match[2])
          return true;
        str = str.slice(match.index + match[0].length);
      }
      return false;
    };
  }
});

// ../helpers/node_modules/is-glob/index.js
var require_is_glob = __commonJS({
  "../helpers/node_modules/is-glob/index.js"(exports, module2) {
    var isExtglob = require_is_extglob();
    var chars = { "{": "}", "(": ")", "[": "]" };
    var strictCheck = function(str) {
      if (str[0] === "!") {
        return true;
      }
      var index = 0;
      var pipeIndex = -2;
      var closeSquareIndex = -2;
      var closeCurlyIndex = -2;
      var closeParenIndex = -2;
      var backSlashIndex = -2;
      while (index < str.length) {
        if (str[index] === "*") {
          return true;
        }
        if (str[index + 1] === "?" && /[\].+)]/.test(str[index])) {
          return true;
        }
        if (closeSquareIndex !== -1 && str[index] === "[" && str[index + 1] !== "]") {
          if (closeSquareIndex < index) {
            closeSquareIndex = str.indexOf("]", index);
          }
          if (closeSquareIndex > index) {
            if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
              return true;
            }
            backSlashIndex = str.indexOf("\\", index);
            if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
              return true;
            }
          }
        }
        if (closeCurlyIndex !== -1 && str[index] === "{" && str[index + 1] !== "}") {
          closeCurlyIndex = str.indexOf("}", index);
          if (closeCurlyIndex > index) {
            backSlashIndex = str.indexOf("\\", index);
            if (backSlashIndex === -1 || backSlashIndex > closeCurlyIndex) {
              return true;
            }
          }
        }
        if (closeParenIndex !== -1 && str[index] === "(" && str[index + 1] === "?" && /[:!=]/.test(str[index + 2]) && str[index + 3] !== ")") {
          closeParenIndex = str.indexOf(")", index);
          if (closeParenIndex > index) {
            backSlashIndex = str.indexOf("\\", index);
            if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
              return true;
            }
          }
        }
        if (pipeIndex !== -1 && str[index] === "(" && str[index + 1] !== "|") {
          if (pipeIndex < index) {
            pipeIndex = str.indexOf("|", index);
          }
          if (pipeIndex !== -1 && str[pipeIndex + 1] !== ")") {
            closeParenIndex = str.indexOf(")", pipeIndex);
            if (closeParenIndex > pipeIndex) {
              backSlashIndex = str.indexOf("\\", pipeIndex);
              if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
                return true;
              }
            }
          }
        }
        if (str[index] === "\\") {
          var open = str[index + 1];
          index += 2;
          var close = chars[open];
          if (close) {
            var n = str.indexOf(close, index);
            if (n !== -1) {
              index = n + 1;
            }
          }
          if (str[index] === "!") {
            return true;
          }
        } else {
          index++;
        }
      }
      return false;
    };
    var relaxedCheck = function(str) {
      if (str[0] === "!") {
        return true;
      }
      var index = 0;
      while (index < str.length) {
        if (/[*?{}()[\]]/.test(str[index])) {
          return true;
        }
        if (str[index] === "\\") {
          var open = str[index + 1];
          index += 2;
          var close = chars[open];
          if (close) {
            var n = str.indexOf(close, index);
            if (n !== -1) {
              index = n + 1;
            }
          }
          if (str[index] === "!") {
            return true;
          }
        } else {
          index++;
        }
      }
      return false;
    };
    module2.exports = function isGlob(str, options) {
      if (typeof str !== "string" || str === "") {
        return false;
      }
      if (isExtglob(str)) {
        return true;
      }
      var check = strictCheck;
      if (options && options.strict === false) {
        check = relaxedCheck;
      }
      return check(str);
    };
  }
});

// ../helpers/node_modules/fast-glob/node_modules/glob-parent/index.js
var require_glob_parent = __commonJS({
  "../helpers/node_modules/fast-glob/node_modules/glob-parent/index.js"(exports, module2) {
    "use strict";
    var isGlob = require_is_glob();
    var pathPosixDirname = require("path").posix.dirname;
    var isWin32 = require("os").platform() === "win32";
    var slash2 = "/";
    var backslash = /\\/g;
    var enclosure = /[\{\[].*[\}\]]$/;
    var globby2 = /(^|[^\\])([\{\[]|\([^\)]+$)/;
    var escaped = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
    module2.exports = function globParent(str, opts) {
      var options = Object.assign({ flipBackslashes: true }, opts);
      if (options.flipBackslashes && isWin32 && str.indexOf(slash2) < 0) {
        str = str.replace(backslash, slash2);
      }
      if (enclosure.test(str)) {
        str += slash2;
      }
      str += "a";
      do {
        str = pathPosixDirname(str);
      } while (isGlob(str) || globby2.test(str));
      return str.replace(escaped, "$1");
    };
  }
});

// ../helpers/node_modules/braces/lib/utils.js
var require_utils = __commonJS({
  "../helpers/node_modules/braces/lib/utils.js"(exports) {
    "use strict";
    exports.isInteger = (num) => {
      if (typeof num === "number") {
        return Number.isInteger(num);
      }
      if (typeof num === "string" && num.trim() !== "") {
        return Number.isInteger(Number(num));
      }
      return false;
    };
    exports.find = (node, type) => node.nodes.find((node2) => node2.type === type);
    exports.exceedsLimit = (min, max, step = 1, limit) => {
      if (limit === false)
        return false;
      if (!exports.isInteger(min) || !exports.isInteger(max))
        return false;
      return (Number(max) - Number(min)) / Number(step) >= limit;
    };
    exports.escapeNode = (block, n = 0, type) => {
      let node = block.nodes[n];
      if (!node)
        return;
      if (type && node.type === type || node.type === "open" || node.type === "close") {
        if (node.escaped !== true) {
          node.value = "\\" + node.value;
          node.escaped = true;
        }
      }
    };
    exports.encloseBrace = (node) => {
      if (node.type !== "brace")
        return false;
      if (node.commas >> 0 + node.ranges >> 0 === 0) {
        node.invalid = true;
        return true;
      }
      return false;
    };
    exports.isInvalidBrace = (block) => {
      if (block.type !== "brace")
        return false;
      if (block.invalid === true || block.dollar)
        return true;
      if (block.commas >> 0 + block.ranges >> 0 === 0) {
        block.invalid = true;
        return true;
      }
      if (block.open !== true || block.close !== true) {
        block.invalid = true;
        return true;
      }
      return false;
    };
    exports.isOpenOrClose = (node) => {
      if (node.type === "open" || node.type === "close") {
        return true;
      }
      return node.open === true || node.close === true;
    };
    exports.reduce = (nodes) => nodes.reduce((acc, node) => {
      if (node.type === "text")
        acc.push(node.value);
      if (node.type === "range")
        node.type = "text";
      return acc;
    }, []);
    exports.flatten = (...args) => {
      const result = [];
      const flat = (arr) => {
        for (let i = 0; i < arr.length; i++) {
          let ele = arr[i];
          Array.isArray(ele) ? flat(ele, result) : ele !== void 0 && result.push(ele);
        }
        return result;
      };
      flat(args);
      return result;
    };
  }
});

// ../helpers/node_modules/braces/lib/stringify.js
var require_stringify = __commonJS({
  "../helpers/node_modules/braces/lib/stringify.js"(exports, module2) {
    "use strict";
    var utils = require_utils();
    module2.exports = (ast, options = {}) => {
      let stringify = (node, parent = {}) => {
        let invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
        let invalidNode = node.invalid === true && options.escapeInvalid === true;
        let output = "";
        if (node.value) {
          if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
            return "\\" + node.value;
          }
          return node.value;
        }
        if (node.value) {
          return node.value;
        }
        if (node.nodes) {
          for (let child of node.nodes) {
            output += stringify(child);
          }
        }
        return output;
      };
      return stringify(ast);
    };
  }
});

// ../helpers/node_modules/is-number/index.js
var require_is_number = __commonJS({
  "../helpers/node_modules/is-number/index.js"(exports, module2) {
    "use strict";
    module2.exports = function(num) {
      if (typeof num === "number") {
        return num - num === 0;
      }
      if (typeof num === "string" && num.trim() !== "") {
        return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
      }
      return false;
    };
  }
});

// ../helpers/node_modules/to-regex-range/index.js
var require_to_regex_range = __commonJS({
  "../helpers/node_modules/to-regex-range/index.js"(exports, module2) {
    "use strict";
    var isNumber = require_is_number();
    var toRegexRange = (min, max, options) => {
      if (isNumber(min) === false) {
        throw new TypeError("toRegexRange: expected the first argument to be a number");
      }
      if (max === void 0 || min === max) {
        return String(min);
      }
      if (isNumber(max) === false) {
        throw new TypeError("toRegexRange: expected the second argument to be a number.");
      }
      let opts = { relaxZeros: true, ...options };
      if (typeof opts.strictZeros === "boolean") {
        opts.relaxZeros = opts.strictZeros === false;
      }
      let relax = String(opts.relaxZeros);
      let shorthand = String(opts.shorthand);
      let capture = String(opts.capture);
      let wrap = String(opts.wrap);
      let cacheKey = min + ":" + max + "=" + relax + shorthand + capture + wrap;
      if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
        return toRegexRange.cache[cacheKey].result;
      }
      let a = Math.min(min, max);
      let b = Math.max(min, max);
      if (Math.abs(a - b) === 1) {
        let result = min + "|" + max;
        if (opts.capture) {
          return `(${result})`;
        }
        if (opts.wrap === false) {
          return result;
        }
        return `(?:${result})`;
      }
      let isPadded = hasPadding(min) || hasPadding(max);
      let state = { min, max, a, b };
      let positives = [];
      let negatives = [];
      if (isPadded) {
        state.isPadded = isPadded;
        state.maxLen = String(state.max).length;
      }
      if (a < 0) {
        let newMin = b < 0 ? Math.abs(b) : 1;
        negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
        a = state.a = 0;
      }
      if (b >= 0) {
        positives = splitToPatterns(a, b, state, opts);
      }
      state.negatives = negatives;
      state.positives = positives;
      state.result = collatePatterns(negatives, positives, opts);
      if (opts.capture === true) {
        state.result = `(${state.result})`;
      } else if (opts.wrap !== false && positives.length + negatives.length > 1) {
        state.result = `(?:${state.result})`;
      }
      toRegexRange.cache[cacheKey] = state;
      return state.result;
    };
    function collatePatterns(neg, pos, options) {
      let onlyNegative = filterPatterns(neg, pos, "-", false, options) || [];
      let onlyPositive = filterPatterns(pos, neg, "", false, options) || [];
      let intersected = filterPatterns(neg, pos, "-?", true, options) || [];
      let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
      return subpatterns.join("|");
    }
    function splitToRanges(min, max) {
      let nines = 1;
      let zeros = 1;
      let stop = countNines(min, nines);
      let stops = /* @__PURE__ */ new Set([max]);
      while (min <= stop && stop <= max) {
        stops.add(stop);
        nines += 1;
        stop = countNines(min, nines);
      }
      stop = countZeros(max + 1, zeros) - 1;
      while (min < stop && stop <= max) {
        stops.add(stop);
        zeros += 1;
        stop = countZeros(max + 1, zeros) - 1;
      }
      stops = [...stops];
      stops.sort(compare);
      return stops;
    }
    function rangeToPattern(start, stop, options) {
      if (start === stop) {
        return { pattern: start, count: [], digits: 0 };
      }
      let zipped = zip(start, stop);
      let digits = zipped.length;
      let pattern = "";
      let count = 0;
      for (let i = 0; i < digits; i++) {
        let [startDigit, stopDigit] = zipped[i];
        if (startDigit === stopDigit) {
          pattern += startDigit;
        } else if (startDigit !== "0" || stopDigit !== "9") {
          pattern += toCharacterClass(startDigit, stopDigit, options);
        } else {
          count++;
        }
      }
      if (count) {
        pattern += options.shorthand === true ? "\\d" : "[0-9]";
      }
      return { pattern, count: [count], digits };
    }
    function splitToPatterns(min, max, tok, options) {
      let ranges = splitToRanges(min, max);
      let tokens = [];
      let start = min;
      let prev;
      for (let i = 0; i < ranges.length; i++) {
        let max2 = ranges[i];
        let obj = rangeToPattern(String(start), String(max2), options);
        let zeros = "";
        if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
          if (prev.count.length > 1) {
            prev.count.pop();
          }
          prev.count.push(obj.count[0]);
          prev.string = prev.pattern + toQuantifier(prev.count);
          start = max2 + 1;
          continue;
        }
        if (tok.isPadded) {
          zeros = padZeros(max2, tok, options);
        }
        obj.string = zeros + obj.pattern + toQuantifier(obj.count);
        tokens.push(obj);
        start = max2 + 1;
        prev = obj;
      }
      return tokens;
    }
    function filterPatterns(arr, comparison, prefix, intersection, options) {
      let result = [];
      for (let ele of arr) {
        let { string } = ele;
        if (!intersection && !contains(comparison, "string", string)) {
          result.push(prefix + string);
        }
        if (intersection && contains(comparison, "string", string)) {
          result.push(prefix + string);
        }
      }
      return result;
    }
    function zip(a, b) {
      let arr = [];
      for (let i = 0; i < a.length; i++)
        arr.push([a[i], b[i]]);
      return arr;
    }
    function compare(a, b) {
      return a > b ? 1 : b > a ? -1 : 0;
    }
    function contains(arr, key, val) {
      return arr.some((ele) => ele[key] === val);
    }
    function countNines(min, len) {
      return Number(String(min).slice(0, -len) + "9".repeat(len));
    }
    function countZeros(integer, zeros) {
      return integer - integer % Math.pow(10, zeros);
    }
    function toQuantifier(digits) {
      let [start = 0, stop = ""] = digits;
      if (stop || start > 1) {
        return `{${start + (stop ? "," + stop : "")}}`;
      }
      return "";
    }
    function toCharacterClass(a, b, options) {
      return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
    }
    function hasPadding(str) {
      return /^-?(0+)\d/.test(str);
    }
    function padZeros(value, tok, options) {
      if (!tok.isPadded) {
        return value;
      }
      let diff = Math.abs(tok.maxLen - String(value).length);
      let relax = options.relaxZeros !== false;
      switch (diff) {
        case 0:
          return "";
        case 1:
          return relax ? "0?" : "0";
        case 2:
          return relax ? "0{0,2}" : "00";
        default: {
          return relax ? `0{0,${diff}}` : `0{${diff}}`;
        }
      }
    }
    toRegexRange.cache = {};
    toRegexRange.clearCache = () => toRegexRange.cache = {};
    module2.exports = toRegexRange;
  }
});

// ../helpers/node_modules/fill-range/index.js
var require_fill_range = __commonJS({
  "../helpers/node_modules/fill-range/index.js"(exports, module2) {
    "use strict";
    var util = require("util");
    var toRegexRange = require_to_regex_range();
    var isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    var transform = (toNumber) => {
      return (value) => toNumber === true ? Number(value) : String(value);
    };
    var isValidValue = (value) => {
      return typeof value === "number" || typeof value === "string" && value !== "";
    };
    var isNumber = (num) => Number.isInteger(+num);
    var zeros = (input) => {
      let value = `${input}`;
      let index = -1;
      if (value[0] === "-")
        value = value.slice(1);
      if (value === "0")
        return false;
      while (value[++index] === "0")
        ;
      return index > 0;
    };
    var stringify = (start, end, options) => {
      if (typeof start === "string" || typeof end === "string") {
        return true;
      }
      return options.stringify === true;
    };
    var pad = (input, maxLength, toNumber) => {
      if (maxLength > 0) {
        let dash = input[0] === "-" ? "-" : "";
        if (dash)
          input = input.slice(1);
        input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
      }
      if (toNumber === false) {
        return String(input);
      }
      return input;
    };
    var toMaxLen = (input, maxLength) => {
      let negative = input[0] === "-" ? "-" : "";
      if (negative) {
        input = input.slice(1);
        maxLength--;
      }
      while (input.length < maxLength)
        input = "0" + input;
      return negative ? "-" + input : input;
    };
    var toSequence = (parts, options) => {
      parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      let prefix = options.capture ? "" : "?:";
      let positives = "";
      let negatives = "";
      let result;
      if (parts.positives.length) {
        positives = parts.positives.join("|");
      }
      if (parts.negatives.length) {
        negatives = `-(${prefix}${parts.negatives.join("|")})`;
      }
      if (positives && negatives) {
        result = `${positives}|${negatives}`;
      } else {
        result = positives || negatives;
      }
      if (options.wrap) {
        return `(${prefix}${result})`;
      }
      return result;
    };
    var toRange = (a, b, isNumbers, options) => {
      if (isNumbers) {
        return toRegexRange(a, b, { wrap: false, ...options });
      }
      let start = String.fromCharCode(a);
      if (a === b)
        return start;
      let stop = String.fromCharCode(b);
      return `[${start}-${stop}]`;
    };
    var toRegex = (start, end, options) => {
      if (Array.isArray(start)) {
        let wrap = options.wrap === true;
        let prefix = options.capture ? "" : "?:";
        return wrap ? `(${prefix}${start.join("|")})` : start.join("|");
      }
      return toRegexRange(start, end, options);
    };
    var rangeError = (...args) => {
      return new RangeError("Invalid range arguments: " + util.inspect(...args));
    };
    var invalidRange = (start, end, options) => {
      if (options.strictRanges === true)
        throw rangeError([start, end]);
      return [];
    };
    var invalidStep = (step, options) => {
      if (options.strictRanges === true) {
        throw new TypeError(`Expected step "${step}" to be a number`);
      }
      return [];
    };
    var fillNumbers = (start, end, step = 1, options = {}) => {
      let a = Number(start);
      let b = Number(end);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        if (options.strictRanges === true)
          throw rangeError([start, end]);
        return [];
      }
      if (a === 0)
        a = 0;
      if (b === 0)
        b = 0;
      let descending = a > b;
      let startString = String(start);
      let endString = String(end);
      let stepString = String(step);
      step = Math.max(Math.abs(step), 1);
      let padded = zeros(startString) || zeros(endString) || zeros(stepString);
      let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
      let toNumber = padded === false && stringify(start, end, options) === false;
      let format = options.transform || transform(toNumber);
      if (options.toRegex && step === 1) {
        return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
      }
      let parts = { negatives: [], positives: [] };
      let push = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
      let range = [];
      let index = 0;
      while (descending ? a >= b : a <= b) {
        if (options.toRegex === true && step > 1) {
          push(a);
        } else {
          range.push(pad(format(a, index), maxLen, toNumber));
        }
        a = descending ? a - step : a + step;
        index++;
      }
      if (options.toRegex === true) {
        return step > 1 ? toSequence(parts, options) : toRegex(range, null, { wrap: false, ...options });
      }
      return range;
    };
    var fillLetters = (start, end, step = 1, options = {}) => {
      if (!isNumber(start) && start.length > 1 || !isNumber(end) && end.length > 1) {
        return invalidRange(start, end, options);
      }
      let format = options.transform || ((val) => String.fromCharCode(val));
      let a = `${start}`.charCodeAt(0);
      let b = `${end}`.charCodeAt(0);
      let descending = a > b;
      let min = Math.min(a, b);
      let max = Math.max(a, b);
      if (options.toRegex && step === 1) {
        return toRange(min, max, false, options);
      }
      let range = [];
      let index = 0;
      while (descending ? a >= b : a <= b) {
        range.push(format(a, index));
        a = descending ? a - step : a + step;
        index++;
      }
      if (options.toRegex === true) {
        return toRegex(range, null, { wrap: false, options });
      }
      return range;
    };
    var fill = (start, end, step, options = {}) => {
      if (end == null && isValidValue(start)) {
        return [start];
      }
      if (!isValidValue(start) || !isValidValue(end)) {
        return invalidRange(start, end, options);
      }
      if (typeof step === "function") {
        return fill(start, end, 1, { transform: step });
      }
      if (isObject(step)) {
        return fill(start, end, 0, step);
      }
      let opts = { ...options };
      if (opts.capture === true)
        opts.wrap = true;
      step = step || opts.step || 1;
      if (!isNumber(step)) {
        if (step != null && !isObject(step))
          return invalidStep(step, opts);
        return fill(start, end, 1, step);
      }
      if (isNumber(start) && isNumber(end)) {
        return fillNumbers(start, end, step, opts);
      }
      return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
    };
    module2.exports = fill;
  }
});

// ../helpers/node_modules/braces/lib/compile.js
var require_compile = __commonJS({
  "../helpers/node_modules/braces/lib/compile.js"(exports, module2) {
    "use strict";
    var fill = require_fill_range();
    var utils = require_utils();
    var compile = (ast, options = {}) => {
      let walk = (node, parent = {}) => {
        let invalidBlock = utils.isInvalidBrace(parent);
        let invalidNode = node.invalid === true && options.escapeInvalid === true;
        let invalid = invalidBlock === true || invalidNode === true;
        let prefix = options.escapeInvalid === true ? "\\" : "";
        let output = "";
        if (node.isOpen === true) {
          return prefix + node.value;
        }
        if (node.isClose === true) {
          return prefix + node.value;
        }
        if (node.type === "open") {
          return invalid ? prefix + node.value : "(";
        }
        if (node.type === "close") {
          return invalid ? prefix + node.value : ")";
        }
        if (node.type === "comma") {
          return node.prev.type === "comma" ? "" : invalid ? node.value : "|";
        }
        if (node.value) {
          return node.value;
        }
        if (node.nodes && node.ranges > 0) {
          let args = utils.reduce(node.nodes);
          let range = fill(...args, { ...options, wrap: false, toRegex: true });
          if (range.length !== 0) {
            return args.length > 1 && range.length > 1 ? `(${range})` : range;
          }
        }
        if (node.nodes) {
          for (let child of node.nodes) {
            output += walk(child, node);
          }
        }
        return output;
      };
      return walk(ast);
    };
    module2.exports = compile;
  }
});

// ../helpers/node_modules/braces/lib/expand.js
var require_expand = __commonJS({
  "../helpers/node_modules/braces/lib/expand.js"(exports, module2) {
    "use strict";
    var fill = require_fill_range();
    var stringify = require_stringify();
    var utils = require_utils();
    var append = (queue = "", stash = "", enclose = false) => {
      let result = [];
      queue = [].concat(queue);
      stash = [].concat(stash);
      if (!stash.length)
        return queue;
      if (!queue.length) {
        return enclose ? utils.flatten(stash).map((ele) => `{${ele}}`) : stash;
      }
      for (let item of queue) {
        if (Array.isArray(item)) {
          for (let value of item) {
            result.push(append(value, stash, enclose));
          }
        } else {
          for (let ele of stash) {
            if (enclose === true && typeof ele === "string")
              ele = `{${ele}}`;
            result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
          }
        }
      }
      return utils.flatten(result);
    };
    var expand = (ast, options = {}) => {
      let rangeLimit = options.rangeLimit === void 0 ? 1e3 : options.rangeLimit;
      let walk = (node, parent = {}) => {
        node.queue = [];
        let p = parent;
        let q = parent.queue;
        while (p.type !== "brace" && p.type !== "root" && p.parent) {
          p = p.parent;
          q = p.queue;
        }
        if (node.invalid || node.dollar) {
          q.push(append(q.pop(), stringify(node, options)));
          return;
        }
        if (node.type === "brace" && node.invalid !== true && node.nodes.length === 2) {
          q.push(append(q.pop(), ["{}"]));
          return;
        }
        if (node.nodes && node.ranges > 0) {
          let args = utils.reduce(node.nodes);
          if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
            throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
          }
          let range = fill(...args, options);
          if (range.length === 0) {
            range = stringify(node, options);
          }
          q.push(append(q.pop(), range));
          node.nodes = [];
          return;
        }
        let enclose = utils.encloseBrace(node);
        let queue = node.queue;
        let block = node;
        while (block.type !== "brace" && block.type !== "root" && block.parent) {
          block = block.parent;
          queue = block.queue;
        }
        for (let i = 0; i < node.nodes.length; i++) {
          let child = node.nodes[i];
          if (child.type === "comma" && node.type === "brace") {
            if (i === 1)
              queue.push("");
            queue.push("");
            continue;
          }
          if (child.type === "close") {
            q.push(append(q.pop(), queue, enclose));
            continue;
          }
          if (child.value && child.type !== "open") {
            queue.push(append(queue.pop(), child.value));
            continue;
          }
          if (child.nodes) {
            walk(child, node);
          }
        }
        return queue;
      };
      return utils.flatten(walk(ast));
    };
    module2.exports = expand;
  }
});

// ../helpers/node_modules/braces/lib/constants.js
var require_constants = __commonJS({
  "../helpers/node_modules/braces/lib/constants.js"(exports, module2) {
    "use strict";
    module2.exports = {
      MAX_LENGTH: 1024 * 64,
      // Digits
      CHAR_0: "0",
      /* 0 */
      CHAR_9: "9",
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: "A",
      /* A */
      CHAR_LOWERCASE_A: "a",
      /* a */
      CHAR_UPPERCASE_Z: "Z",
      /* Z */
      CHAR_LOWERCASE_Z: "z",
      /* z */
      CHAR_LEFT_PARENTHESES: "(",
      /* ( */
      CHAR_RIGHT_PARENTHESES: ")",
      /* ) */
      CHAR_ASTERISK: "*",
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: "&",
      /* & */
      CHAR_AT: "@",
      /* @ */
      CHAR_BACKSLASH: "\\",
      /* \ */
      CHAR_BACKTICK: "`",
      /* ` */
      CHAR_CARRIAGE_RETURN: "\r",
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: "^",
      /* ^ */
      CHAR_COLON: ":",
      /* : */
      CHAR_COMMA: ",",
      /* , */
      CHAR_DOLLAR: "$",
      /* . */
      CHAR_DOT: ".",
      /* . */
      CHAR_DOUBLE_QUOTE: '"',
      /* " */
      CHAR_EQUAL: "=",
      /* = */
      CHAR_EXCLAMATION_MARK: "!",
      /* ! */
      CHAR_FORM_FEED: "\f",
      /* \f */
      CHAR_FORWARD_SLASH: "/",
      /* / */
      CHAR_HASH: "#",
      /* # */
      CHAR_HYPHEN_MINUS: "-",
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: "<",
      /* < */
      CHAR_LEFT_CURLY_BRACE: "{",
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: "[",
      /* [ */
      CHAR_LINE_FEED: "\n",
      /* \n */
      CHAR_NO_BREAK_SPACE: "\xA0",
      /* \u00A0 */
      CHAR_PERCENT: "%",
      /* % */
      CHAR_PLUS: "+",
      /* + */
      CHAR_QUESTION_MARK: "?",
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: ">",
      /* > */
      CHAR_RIGHT_CURLY_BRACE: "}",
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: "]",
      /* ] */
      CHAR_SEMICOLON: ";",
      /* ; */
      CHAR_SINGLE_QUOTE: "'",
      /* ' */
      CHAR_SPACE: " ",
      /*   */
      CHAR_TAB: "	",
      /* \t */
      CHAR_UNDERSCORE: "_",
      /* _ */
      CHAR_VERTICAL_LINE: "|",
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\uFEFF"
      /* \uFEFF */
    };
  }
});

// ../helpers/node_modules/braces/lib/parse.js
var require_parse = __commonJS({
  "../helpers/node_modules/braces/lib/parse.js"(exports, module2) {
    "use strict";
    var stringify = require_stringify();
    var {
      MAX_LENGTH,
      CHAR_BACKSLASH,
      /* \ */
      CHAR_BACKTICK,
      /* ` */
      CHAR_COMMA,
      /* , */
      CHAR_DOT,
      /* . */
      CHAR_LEFT_PARENTHESES,
      /* ( */
      CHAR_RIGHT_PARENTHESES,
      /* ) */
      CHAR_LEFT_CURLY_BRACE,
      /* { */
      CHAR_RIGHT_CURLY_BRACE,
      /* } */
      CHAR_LEFT_SQUARE_BRACKET,
      /* [ */
      CHAR_RIGHT_SQUARE_BRACKET,
      /* ] */
      CHAR_DOUBLE_QUOTE,
      /* " */
      CHAR_SINGLE_QUOTE,
      /* ' */
      CHAR_NO_BREAK_SPACE,
      CHAR_ZERO_WIDTH_NOBREAK_SPACE
    } = require_constants();
    var parse = (input, options = {}) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected a string");
      }
      let opts = options || {};
      let max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      if (input.length > max) {
        throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
      }
      let ast = { type: "root", input, nodes: [] };
      let stack = [ast];
      let block = ast;
      let prev = ast;
      let brackets = 0;
      let length = input.length;
      let index = 0;
      let depth = 0;
      let value;
      let memo = {};
      const advance = () => input[index++];
      const push = (node) => {
        if (node.type === "text" && prev.type === "dot") {
          prev.type = "text";
        }
        if (prev && prev.type === "text" && node.type === "text") {
          prev.value += node.value;
          return;
        }
        block.nodes.push(node);
        node.parent = block;
        node.prev = prev;
        prev = node;
        return node;
      };
      push({ type: "bos" });
      while (index < length) {
        block = stack[stack.length - 1];
        value = advance();
        if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) {
          continue;
        }
        if (value === CHAR_BACKSLASH) {
          push({ type: "text", value: (options.keepEscaping ? value : "") + advance() });
          continue;
        }
        if (value === CHAR_RIGHT_SQUARE_BRACKET) {
          push({ type: "text", value: "\\" + value });
          continue;
        }
        if (value === CHAR_LEFT_SQUARE_BRACKET) {
          brackets++;
          let closed = true;
          let next;
          while (index < length && (next = advance())) {
            value += next;
            if (next === CHAR_LEFT_SQUARE_BRACKET) {
              brackets++;
              continue;
            }
            if (next === CHAR_BACKSLASH) {
              value += advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              brackets--;
              if (brackets === 0) {
                break;
              }
            }
          }
          push({ type: "text", value });
          continue;
        }
        if (value === CHAR_LEFT_PARENTHESES) {
          block = push({ type: "paren", nodes: [] });
          stack.push(block);
          push({ type: "text", value });
          continue;
        }
        if (value === CHAR_RIGHT_PARENTHESES) {
          if (block.type !== "paren") {
            push({ type: "text", value });
            continue;
          }
          block = stack.pop();
          push({ type: "text", value });
          block = stack[stack.length - 1];
          continue;
        }
        if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
          let open = value;
          let next;
          if (options.keepQuotes !== true) {
            value = "";
          }
          while (index < length && (next = advance())) {
            if (next === CHAR_BACKSLASH) {
              value += next + advance();
              continue;
            }
            if (next === open) {
              if (options.keepQuotes === true)
                value += next;
              break;
            }
            value += next;
          }
          push({ type: "text", value });
          continue;
        }
        if (value === CHAR_LEFT_CURLY_BRACE) {
          depth++;
          let dollar = prev.value && prev.value.slice(-1) === "$" || block.dollar === true;
          let brace = {
            type: "brace",
            open: true,
            close: false,
            dollar,
            depth,
            commas: 0,
            ranges: 0,
            nodes: []
          };
          block = push(brace);
          stack.push(block);
          push({ type: "open", value });
          continue;
        }
        if (value === CHAR_RIGHT_CURLY_BRACE) {
          if (block.type !== "brace") {
            push({ type: "text", value });
            continue;
          }
          let type = "close";
          block = stack.pop();
          block.close = true;
          push({ type, value });
          depth--;
          block = stack[stack.length - 1];
          continue;
        }
        if (value === CHAR_COMMA && depth > 0) {
          if (block.ranges > 0) {
            block.ranges = 0;
            let open = block.nodes.shift();
            block.nodes = [open, { type: "text", value: stringify(block) }];
          }
          push({ type: "comma", value });
          block.commas++;
          continue;
        }
        if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
          let siblings = block.nodes;
          if (depth === 0 || siblings.length === 0) {
            push({ type: "text", value });
            continue;
          }
          if (prev.type === "dot") {
            block.range = [];
            prev.value += value;
            prev.type = "range";
            if (block.nodes.length !== 3 && block.nodes.length !== 5) {
              block.invalid = true;
              block.ranges = 0;
              prev.type = "text";
              continue;
            }
            block.ranges++;
            block.args = [];
            continue;
          }
          if (prev.type === "range") {
            siblings.pop();
            let before = siblings[siblings.length - 1];
            before.value += prev.value + value;
            prev = before;
            block.ranges--;
            continue;
          }
          push({ type: "dot", value });
          continue;
        }
        push({ type: "text", value });
      }
      do {
        block = stack.pop();
        if (block.type !== "root") {
          block.nodes.forEach((node) => {
            if (!node.nodes) {
              if (node.type === "open")
                node.isOpen = true;
              if (node.type === "close")
                node.isClose = true;
              if (!node.nodes)
                node.type = "text";
              node.invalid = true;
            }
          });
          let parent = stack[stack.length - 1];
          let index2 = parent.nodes.indexOf(block);
          parent.nodes.splice(index2, 1, ...block.nodes);
        }
      } while (stack.length > 0);
      push({ type: "eos" });
      return ast;
    };
    module2.exports = parse;
  }
});

// ../helpers/node_modules/braces/index.js
var require_braces = __commonJS({
  "../helpers/node_modules/braces/index.js"(exports, module2) {
    "use strict";
    var stringify = require_stringify();
    var compile = require_compile();
    var expand = require_expand();
    var parse = require_parse();
    var braces = (input, options = {}) => {
      let output = [];
      if (Array.isArray(input)) {
        for (let pattern of input) {
          let result = braces.create(pattern, options);
          if (Array.isArray(result)) {
            output.push(...result);
          } else {
            output.push(result);
          }
        }
      } else {
        output = [].concat(braces.create(input, options));
      }
      if (options && options.expand === true && options.nodupes === true) {
        output = [...new Set(output)];
      }
      return output;
    };
    braces.parse = (input, options = {}) => parse(input, options);
    braces.stringify = (input, options = {}) => {
      if (typeof input === "string") {
        return stringify(braces.parse(input, options), options);
      }
      return stringify(input, options);
    };
    braces.compile = (input, options = {}) => {
      if (typeof input === "string") {
        input = braces.parse(input, options);
      }
      return compile(input, options);
    };
    braces.expand = (input, options = {}) => {
      if (typeof input === "string") {
        input = braces.parse(input, options);
      }
      let result = expand(input, options);
      if (options.noempty === true) {
        result = result.filter(Boolean);
      }
      if (options.nodupes === true) {
        result = [...new Set(result)];
      }
      return result;
    };
    braces.create = (input, options = {}) => {
      if (input === "" || input.length < 3) {
        return [input];
      }
      return options.expand !== true ? braces.compile(input, options) : braces.expand(input, options);
    };
    module2.exports = braces;
  }
});

// ../helpers/node_modules/picomatch/lib/constants.js
var require_constants2 = __commonJS({
  "../helpers/node_modules/picomatch/lib/constants.js"(exports, module2) {
    "use strict";
    var path5 = require("path");
    var WIN_SLASH = "\\\\/";
    var WIN_NO_SLASH = `[^${WIN_SLASH}]`;
    var DOT_LITERAL = "\\.";
    var PLUS_LITERAL = "\\+";
    var QMARK_LITERAL = "\\?";
    var SLASH_LITERAL = "\\/";
    var ONE_CHAR = "(?=.)";
    var QMARK = "[^/]";
    var END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
    var START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
    var DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
    var NO_DOT = `(?!${DOT_LITERAL})`;
    var NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
    var NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
    var NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
    var QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
    var STAR = `${QMARK}*?`;
    var POSIX_CHARS = {
      DOT_LITERAL,
      PLUS_LITERAL,
      QMARK_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      QMARK,
      END_ANCHOR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR
    };
    var WINDOWS_CHARS = {
      ...POSIX_CHARS,
      SLASH_LITERAL: `[${WIN_SLASH}]`,
      QMARK: WIN_NO_SLASH,
      STAR: `${WIN_NO_SLASH}*?`,
      DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
      NO_DOT: `(?!${DOT_LITERAL})`,
      NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
      NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
      START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
      END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
    };
    var POSIX_REGEX_SOURCE = {
      alnum: "a-zA-Z0-9",
      alpha: "a-zA-Z",
      ascii: "\\x00-\\x7F",
      blank: " \\t",
      cntrl: "\\x00-\\x1F\\x7F",
      digit: "0-9",
      graph: "\\x21-\\x7E",
      lower: "a-z",
      print: "\\x20-\\x7E ",
      punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
      space: " \\t\\r\\n\\v\\f",
      upper: "A-Z",
      word: "A-Za-z0-9_",
      xdigit: "A-Fa-f0-9"
    };
    module2.exports = {
      MAX_LENGTH: 1024 * 64,
      POSIX_REGEX_SOURCE,
      // regular expressions
      REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
      REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
      REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
      REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
      REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
      REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
      // Replace globs with equivalent patterns to reduce parsing time.
      REPLACEMENTS: {
        "***": "*",
        "**/**": "**",
        "**/**/**": "**"
      },
      // Digits
      CHAR_0: 48,
      /* 0 */
      CHAR_9: 57,
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: 65,
      /* A */
      CHAR_LOWERCASE_A: 97,
      /* a */
      CHAR_UPPERCASE_Z: 90,
      /* Z */
      CHAR_LOWERCASE_Z: 122,
      /* z */
      CHAR_LEFT_PARENTHESES: 40,
      /* ( */
      CHAR_RIGHT_PARENTHESES: 41,
      /* ) */
      CHAR_ASTERISK: 42,
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: 38,
      /* & */
      CHAR_AT: 64,
      /* @ */
      CHAR_BACKWARD_SLASH: 92,
      /* \ */
      CHAR_CARRIAGE_RETURN: 13,
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: 94,
      /* ^ */
      CHAR_COLON: 58,
      /* : */
      CHAR_COMMA: 44,
      /* , */
      CHAR_DOT: 46,
      /* . */
      CHAR_DOUBLE_QUOTE: 34,
      /* " */
      CHAR_EQUAL: 61,
      /* = */
      CHAR_EXCLAMATION_MARK: 33,
      /* ! */
      CHAR_FORM_FEED: 12,
      /* \f */
      CHAR_FORWARD_SLASH: 47,
      /* / */
      CHAR_GRAVE_ACCENT: 96,
      /* ` */
      CHAR_HASH: 35,
      /* # */
      CHAR_HYPHEN_MINUS: 45,
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: 60,
      /* < */
      CHAR_LEFT_CURLY_BRACE: 123,
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: 91,
      /* [ */
      CHAR_LINE_FEED: 10,
      /* \n */
      CHAR_NO_BREAK_SPACE: 160,
      /* \u00A0 */
      CHAR_PERCENT: 37,
      /* % */
      CHAR_PLUS: 43,
      /* + */
      CHAR_QUESTION_MARK: 63,
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: 62,
      /* > */
      CHAR_RIGHT_CURLY_BRACE: 125,
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: 93,
      /* ] */
      CHAR_SEMICOLON: 59,
      /* ; */
      CHAR_SINGLE_QUOTE: 39,
      /* ' */
      CHAR_SPACE: 32,
      /*   */
      CHAR_TAB: 9,
      /* \t */
      CHAR_UNDERSCORE: 95,
      /* _ */
      CHAR_VERTICAL_LINE: 124,
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
      /* \uFEFF */
      SEP: path5.sep,
      /**
       * Create EXTGLOB_CHARS
       */
      extglobChars(chars) {
        return {
          "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
          "?": { type: "qmark", open: "(?:", close: ")?" },
          "+": { type: "plus", open: "(?:", close: ")+" },
          "*": { type: "star", open: "(?:", close: ")*" },
          "@": { type: "at", open: "(?:", close: ")" }
        };
      },
      /**
       * Create GLOB_CHARS
       */
      globChars(win32) {
        return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
      }
    };
  }
});

// ../helpers/node_modules/picomatch/lib/utils.js
var require_utils2 = __commonJS({
  "../helpers/node_modules/picomatch/lib/utils.js"(exports) {
    "use strict";
    var path5 = require("path");
    var win32 = process.platform === "win32";
    var {
      REGEX_BACKSLASH,
      REGEX_REMOVE_BACKSLASH,
      REGEX_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_GLOBAL
    } = require_constants2();
    exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
    exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
    exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
    exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
    exports.removeBackslashes = (str) => {
      return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
        return match === "\\" ? "" : match;
      });
    };
    exports.supportsLookbehinds = () => {
      const segs = process.version.slice(1).split(".").map(Number);
      if (segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10) {
        return true;
      }
      return false;
    };
    exports.isWindows = (options) => {
      if (options && typeof options.windows === "boolean") {
        return options.windows;
      }
      return win32 === true || path5.sep === "\\";
    };
    exports.escapeLast = (input, char, lastIdx) => {
      const idx = input.lastIndexOf(char, lastIdx);
      if (idx === -1)
        return input;
      if (input[idx - 1] === "\\")
        return exports.escapeLast(input, char, idx - 1);
      return `${input.slice(0, idx)}\\${input.slice(idx)}`;
    };
    exports.removePrefix = (input, state = {}) => {
      let output = input;
      if (output.startsWith("./")) {
        output = output.slice(2);
        state.prefix = "./";
      }
      return output;
    };
    exports.wrapOutput = (input, state = {}, options = {}) => {
      const prepend = options.contains ? "" : "^";
      const append = options.contains ? "" : "$";
      let output = `${prepend}(?:${input})${append}`;
      if (state.negated === true) {
        output = `(?:^(?!${output}).*$)`;
      }
      return output;
    };
  }
});

// ../helpers/node_modules/picomatch/lib/scan.js
var require_scan = __commonJS({
  "../helpers/node_modules/picomatch/lib/scan.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var {
      CHAR_ASTERISK,
      /* * */
      CHAR_AT,
      /* @ */
      CHAR_BACKWARD_SLASH,
      /* \ */
      CHAR_COMMA,
      /* , */
      CHAR_DOT,
      /* . */
      CHAR_EXCLAMATION_MARK,
      /* ! */
      CHAR_FORWARD_SLASH,
      /* / */
      CHAR_LEFT_CURLY_BRACE,
      /* { */
      CHAR_LEFT_PARENTHESES,
      /* ( */
      CHAR_LEFT_SQUARE_BRACKET,
      /* [ */
      CHAR_PLUS,
      /* + */
      CHAR_QUESTION_MARK,
      /* ? */
      CHAR_RIGHT_CURLY_BRACE,
      /* } */
      CHAR_RIGHT_PARENTHESES,
      /* ) */
      CHAR_RIGHT_SQUARE_BRACKET
      /* ] */
    } = require_constants2();
    var isPathSeparator = (code) => {
      return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
    };
    var depth = (token) => {
      if (token.isPrefix !== true) {
        token.depth = token.isGlobstar ? Infinity : 1;
      }
    };
    var scan = (input, options) => {
      const opts = options || {};
      const length = input.length - 1;
      const scanToEnd = opts.parts === true || opts.scanToEnd === true;
      const slashes = [];
      const tokens = [];
      const parts = [];
      let str = input;
      let index = -1;
      let start = 0;
      let lastIndex = 0;
      let isBrace = false;
      let isBracket = false;
      let isGlob = false;
      let isExtglob = false;
      let isGlobstar = false;
      let braceEscaped = false;
      let backslashes = false;
      let negated = false;
      let negatedExtglob = false;
      let finished = false;
      let braces = 0;
      let prev;
      let code;
      let token = { value: "", depth: 0, isGlob: false };
      const eos = () => index >= length;
      const peek = () => str.charCodeAt(index + 1);
      const advance = () => {
        prev = code;
        return str.charCodeAt(++index);
      };
      while (index < length) {
        code = advance();
        let next;
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = true;
          code = advance();
          if (code === CHAR_LEFT_CURLY_BRACE) {
            braceEscaped = true;
          }
          continue;
        }
        if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              advance();
              continue;
            }
            if (code === CHAR_LEFT_CURLY_BRACE) {
              braces++;
              continue;
            }
            if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
              isBrace = token.isBrace = true;
              isGlob = token.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (braceEscaped !== true && code === CHAR_COMMA) {
              isBrace = token.isBrace = true;
              isGlob = token.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (code === CHAR_RIGHT_CURLY_BRACE) {
              braces--;
              if (braces === 0) {
                braceEscaped = false;
                isBrace = token.isBrace = true;
                finished = true;
                break;
              }
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_FORWARD_SLASH) {
          slashes.push(index);
          tokens.push(token);
          token = { value: "", depth: 0, isGlob: false };
          if (finished === true)
            continue;
          if (prev === CHAR_DOT && index === start + 1) {
            start += 2;
            continue;
          }
          lastIndex = index + 1;
          continue;
        }
        if (opts.noext !== true) {
          const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
          if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
            isGlob = token.isGlob = true;
            isExtglob = token.isExtglob = true;
            finished = true;
            if (code === CHAR_EXCLAMATION_MARK && index === start) {
              negatedExtglob = true;
            }
            if (scanToEnd === true) {
              while (eos() !== true && (code = advance())) {
                if (code === CHAR_BACKWARD_SLASH) {
                  backslashes = token.backslashes = true;
                  code = advance();
                  continue;
                }
                if (code === CHAR_RIGHT_PARENTHESES) {
                  isGlob = token.isGlob = true;
                  finished = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
        }
        if (code === CHAR_ASTERISK) {
          if (prev === CHAR_ASTERISK)
            isGlobstar = token.isGlobstar = true;
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_QUESTION_MARK) {
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_LEFT_SQUARE_BRACKET) {
          while (eos() !== true && (next = advance())) {
            if (next === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = true;
              advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              isBracket = token.isBracket = true;
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
          negated = token.negated = true;
          start++;
          continue;
        }
        if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
          isGlob = token.isGlob = true;
          if (scanToEnd === true) {
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_LEFT_PARENTHESES) {
                backslashes = token.backslashes = true;
                code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                finished = true;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (isGlob === true) {
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
      }
      if (opts.noext === true) {
        isExtglob = false;
        isGlob = false;
      }
      let base = str;
      let prefix = "";
      let glob = "";
      if (start > 0) {
        prefix = str.slice(0, start);
        str = str.slice(start);
        lastIndex -= start;
      }
      if (base && isGlob === true && lastIndex > 0) {
        base = str.slice(0, lastIndex);
        glob = str.slice(lastIndex);
      } else if (isGlob === true) {
        base = "";
        glob = str;
      } else {
        base = str;
      }
      if (base && base !== "" && base !== "/" && base !== str) {
        if (isPathSeparator(base.charCodeAt(base.length - 1))) {
          base = base.slice(0, -1);
        }
      }
      if (opts.unescape === true) {
        if (glob)
          glob = utils.removeBackslashes(glob);
        if (base && backslashes === true) {
          base = utils.removeBackslashes(base);
        }
      }
      const state = {
        prefix,
        input,
        start,
        base,
        glob,
        isBrace,
        isBracket,
        isGlob,
        isExtglob,
        isGlobstar,
        negated,
        negatedExtglob
      };
      if (opts.tokens === true) {
        state.maxDepth = 0;
        if (!isPathSeparator(code)) {
          tokens.push(token);
        }
        state.tokens = tokens;
      }
      if (opts.parts === true || opts.tokens === true) {
        let prevIndex;
        for (let idx = 0; idx < slashes.length; idx++) {
          const n = prevIndex ? prevIndex + 1 : start;
          const i = slashes[idx];
          const value = input.slice(n, i);
          if (opts.tokens) {
            if (idx === 0 && start !== 0) {
              tokens[idx].isPrefix = true;
              tokens[idx].value = prefix;
            } else {
              tokens[idx].value = value;
            }
            depth(tokens[idx]);
            state.maxDepth += tokens[idx].depth;
          }
          if (idx !== 0 || value !== "") {
            parts.push(value);
          }
          prevIndex = i;
        }
        if (prevIndex && prevIndex + 1 < input.length) {
          const value = input.slice(prevIndex + 1);
          parts.push(value);
          if (opts.tokens) {
            tokens[tokens.length - 1].value = value;
            depth(tokens[tokens.length - 1]);
            state.maxDepth += tokens[tokens.length - 1].depth;
          }
        }
        state.slashes = slashes;
        state.parts = parts;
      }
      return state;
    };
    module2.exports = scan;
  }
});

// ../helpers/node_modules/picomatch/lib/parse.js
var require_parse2 = __commonJS({
  "../helpers/node_modules/picomatch/lib/parse.js"(exports, module2) {
    "use strict";
    var constants = require_constants2();
    var utils = require_utils2();
    var {
      MAX_LENGTH,
      POSIX_REGEX_SOURCE,
      REGEX_NON_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_BACKREF,
      REPLACEMENTS
    } = constants;
    var expandRange = (args, options) => {
      if (typeof options.expandRange === "function") {
        return options.expandRange(...args, options);
      }
      args.sort();
      const value = `[${args.join("-")}]`;
      try {
        new RegExp(value);
      } catch (ex) {
        return args.map((v) => utils.escapeRegex(v)).join("..");
      }
      return value;
    };
    var syntaxError = (type, char) => {
      return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
    };
    var parse = (input, options) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected a string");
      }
      input = REPLACEMENTS[input] || input;
      const opts = { ...options };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      let len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      const bos = { type: "bos", value: "", output: opts.prepend || "" };
      const tokens = [bos];
      const capture = opts.capture ? "" : "?:";
      const win32 = utils.isWindows(options);
      const PLATFORM_CHARS = constants.globChars(win32);
      const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
      const {
        DOT_LITERAL,
        PLUS_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOT_SLASH,
        NO_DOTS_SLASH,
        QMARK,
        QMARK_NO_DOT,
        STAR,
        START_ANCHOR
      } = PLATFORM_CHARS;
      const globstar = (opts2) => {
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const nodot = opts.dot ? "" : NO_DOT;
      const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
      let star = opts.bash === true ? globstar(opts) : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      if (typeof opts.noext === "boolean") {
        opts.noextglob = opts.noext;
      }
      const state = {
        input,
        index: -1,
        start: 0,
        dot: opts.dot === true,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: false,
        negated: false,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: false,
        tokens
      };
      input = utils.removePrefix(input, state);
      len = input.length;
      const extglobs = [];
      const braces = [];
      const stack = [];
      let prev = bos;
      let value;
      const eos = () => state.index === len - 1;
      const peek = state.peek = (n = 1) => input[state.index + n];
      const advance = state.advance = () => input[++state.index] || "";
      const remaining = () => input.slice(state.index + 1);
      const consume = (value2 = "", num = 0) => {
        state.consumed += value2;
        state.index += num;
      };
      const append = (token) => {
        state.output += token.output != null ? token.output : token.value;
        consume(token.value);
      };
      const negate = () => {
        let count = 1;
        while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
          advance();
          state.start++;
          count++;
        }
        if (count % 2 === 0) {
          return false;
        }
        state.negated = true;
        state.start++;
        return true;
      };
      const increment = (type) => {
        state[type]++;
        stack.push(type);
      };
      const decrement = (type) => {
        state[type]--;
        stack.pop();
      };
      const push = (tok) => {
        if (prev.type === "globstar") {
          const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
          const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
          if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
            state.output = state.output.slice(0, -prev.output.length);
            prev.type = "star";
            prev.value = "*";
            prev.output = star;
            state.output += prev.output;
          }
        }
        if (extglobs.length && tok.type !== "paren") {
          extglobs[extglobs.length - 1].inner += tok.value;
        }
        if (tok.value || tok.output)
          append(tok);
        if (prev && prev.type === "text" && tok.type === "text") {
          prev.value += tok.value;
          prev.output = (prev.output || "") + tok.value;
          return;
        }
        tok.prev = prev;
        tokens.push(tok);
        prev = tok;
      };
      const extglobOpen = (type, value2) => {
        const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
        token.prev = prev;
        token.parens = state.parens;
        token.output = state.output;
        const output = (opts.capture ? "(" : "") + token.open;
        increment("parens");
        push({ type, value: value2, output: state.output ? "" : ONE_CHAR });
        push({ type: "paren", extglob: true, value: advance(), output });
        extglobs.push(token);
      };
      const extglobClose = (token) => {
        let output = token.close + (opts.capture ? ")" : "");
        let rest;
        if (token.type === "negate") {
          let extglobStar = star;
          if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
            extglobStar = globstar(opts);
          }
          if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
            output = token.close = `)$))${extglobStar}`;
          }
          if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
            const expression = parse(rest, { ...options, fastpaths: false }).output;
            output = token.close = `)${expression})${extglobStar})`;
          }
          if (token.prev.type === "bos") {
            state.negatedExtglob = true;
          }
        }
        push({ type: "paren", extglob: true, value, output });
        decrement("parens");
      };
      if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
        let backslashes = false;
        let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
          if (first === "\\") {
            backslashes = true;
            return m;
          }
          if (first === "?") {
            if (esc) {
              return esc + first + (rest ? QMARK.repeat(rest.length) : "");
            }
            if (index === 0) {
              return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
            }
            return QMARK.repeat(chars.length);
          }
          if (first === ".") {
            return DOT_LITERAL.repeat(chars.length);
          }
          if (first === "*") {
            if (esc) {
              return esc + first + (rest ? star : "");
            }
            return star;
          }
          return esc ? m : `\\${m}`;
        });
        if (backslashes === true) {
          if (opts.unescape === true) {
            output = output.replace(/\\/g, "");
          } else {
            output = output.replace(/\\+/g, (m) => {
              return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
            });
          }
        }
        if (output === input && opts.contains === true) {
          state.output = input;
          return state;
        }
        state.output = utils.wrapOutput(output, state, options);
        return state;
      }
      while (!eos()) {
        value = advance();
        if (value === "\0") {
          continue;
        }
        if (value === "\\") {
          const next = peek();
          if (next === "/" && opts.bash !== true) {
            continue;
          }
          if (next === "." || next === ";") {
            continue;
          }
          if (!next) {
            value += "\\";
            push({ type: "text", value });
            continue;
          }
          const match = /^\\+/.exec(remaining());
          let slashes = 0;
          if (match && match[0].length > 2) {
            slashes = match[0].length;
            state.index += slashes;
            if (slashes % 2 !== 0) {
              value += "\\";
            }
          }
          if (opts.unescape === true) {
            value = advance();
          } else {
            value += advance();
          }
          if (state.brackets === 0) {
            push({ type: "text", value });
            continue;
          }
        }
        if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
          if (opts.posix !== false && value === ":") {
            const inner = prev.value.slice(1);
            if (inner.includes("[")) {
              prev.posix = true;
              if (inner.includes(":")) {
                const idx = prev.value.lastIndexOf("[");
                const pre = prev.value.slice(0, idx);
                const rest2 = prev.value.slice(idx + 2);
                const posix = POSIX_REGEX_SOURCE[rest2];
                if (posix) {
                  prev.value = pre + posix;
                  state.backtrack = true;
                  advance();
                  if (!bos.output && tokens.indexOf(prev) === 1) {
                    bos.output = ONE_CHAR;
                  }
                  continue;
                }
              }
            }
          }
          if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
            value = `\\${value}`;
          }
          if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
            value = `\\${value}`;
          }
          if (opts.posix === true && value === "!" && prev.value === "[") {
            value = "^";
          }
          prev.value += value;
          append({ value });
          continue;
        }
        if (state.quotes === 1 && value !== '"') {
          value = utils.escapeRegex(value);
          prev.value += value;
          append({ value });
          continue;
        }
        if (value === '"') {
          state.quotes = state.quotes === 1 ? 0 : 1;
          if (opts.keepQuotes === true) {
            push({ type: "text", value });
          }
          continue;
        }
        if (value === "(") {
          increment("parens");
          push({ type: "paren", value });
          continue;
        }
        if (value === ")") {
          if (state.parens === 0 && opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("opening", "("));
          }
          const extglob = extglobs[extglobs.length - 1];
          if (extglob && state.parens === extglob.parens + 1) {
            extglobClose(extglobs.pop());
            continue;
          }
          push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
          decrement("parens");
          continue;
        }
        if (value === "[") {
          if (opts.nobracket === true || !remaining().includes("]")) {
            if (opts.nobracket !== true && opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("closing", "]"));
            }
            value = `\\${value}`;
          } else {
            increment("brackets");
          }
          push({ type: "bracket", value });
          continue;
        }
        if (value === "]") {
          if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          if (state.brackets === 0) {
            if (opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("opening", "["));
            }
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          decrement("brackets");
          const prevValue = prev.value.slice(1);
          if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
            value = `/${value}`;
          }
          prev.value += value;
          append({ value });
          if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
            continue;
          }
          const escaped = utils.escapeRegex(prev.value);
          state.output = state.output.slice(0, -prev.value.length);
          if (opts.literalBrackets === true) {
            state.output += escaped;
            prev.value = escaped;
            continue;
          }
          prev.value = `(${capture}${escaped}|${prev.value})`;
          state.output += prev.value;
          continue;
        }
        if (value === "{" && opts.nobrace !== true) {
          increment("braces");
          const open = {
            type: "brace",
            value,
            output: "(",
            outputIndex: state.output.length,
            tokensIndex: state.tokens.length
          };
          braces.push(open);
          push(open);
          continue;
        }
        if (value === "}") {
          const brace = braces[braces.length - 1];
          if (opts.nobrace === true || !brace) {
            push({ type: "text", value, output: value });
            continue;
          }
          let output = ")";
          if (brace.dots === true) {
            const arr = tokens.slice();
            const range = [];
            for (let i = arr.length - 1; i >= 0; i--) {
              tokens.pop();
              if (arr[i].type === "brace") {
                break;
              }
              if (arr[i].type !== "dots") {
                range.unshift(arr[i].value);
              }
            }
            output = expandRange(range, opts);
            state.backtrack = true;
          }
          if (brace.comma !== true && brace.dots !== true) {
            const out = state.output.slice(0, brace.outputIndex);
            const toks = state.tokens.slice(brace.tokensIndex);
            brace.value = brace.output = "\\{";
            value = output = "\\}";
            state.output = out;
            for (const t of toks) {
              state.output += t.output || t.value;
            }
          }
          push({ type: "brace", value, output });
          decrement("braces");
          braces.pop();
          continue;
        }
        if (value === "|") {
          if (extglobs.length > 0) {
            extglobs[extglobs.length - 1].conditions++;
          }
          push({ type: "text", value });
          continue;
        }
        if (value === ",") {
          let output = value;
          const brace = braces[braces.length - 1];
          if (brace && stack[stack.length - 1] === "braces") {
            brace.comma = true;
            output = "|";
          }
          push({ type: "comma", value, output });
          continue;
        }
        if (value === "/") {
          if (prev.type === "dot" && state.index === state.start + 1) {
            state.start = state.index + 1;
            state.consumed = "";
            state.output = "";
            tokens.pop();
            prev = bos;
            continue;
          }
          push({ type: "slash", value, output: SLASH_LITERAL });
          continue;
        }
        if (value === ".") {
          if (state.braces > 0 && prev.type === "dot") {
            if (prev.value === ".")
              prev.output = DOT_LITERAL;
            const brace = braces[braces.length - 1];
            prev.type = "dots";
            prev.output += value;
            prev.value += value;
            brace.dots = true;
            continue;
          }
          if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
            push({ type: "text", value, output: DOT_LITERAL });
            continue;
          }
          push({ type: "dot", value, output: DOT_LITERAL });
          continue;
        }
        if (value === "?") {
          const isGroup = prev && prev.value === "(";
          if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            extglobOpen("qmark", value);
            continue;
          }
          if (prev && prev.type === "paren") {
            const next = peek();
            let output = value;
            if (next === "<" && !utils.supportsLookbehinds()) {
              throw new Error("Node.js v10 or higher is required for regex lookbehinds");
            }
            if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
              output = `\\${value}`;
            }
            push({ type: "text", value, output });
            continue;
          }
          if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
            push({ type: "qmark", value, output: QMARK_NO_DOT });
            continue;
          }
          push({ type: "qmark", value, output: QMARK });
          continue;
        }
        if (value === "!") {
          if (opts.noextglob !== true && peek() === "(") {
            if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
              extglobOpen("negate", value);
              continue;
            }
          }
          if (opts.nonegate !== true && state.index === 0) {
            negate();
            continue;
          }
        }
        if (value === "+") {
          if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            extglobOpen("plus", value);
            continue;
          }
          if (prev && prev.value === "(" || opts.regex === false) {
            push({ type: "plus", value, output: PLUS_LITERAL });
            continue;
          }
          if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
            push({ type: "plus", value });
            continue;
          }
          push({ type: "plus", value: PLUS_LITERAL });
          continue;
        }
        if (value === "@") {
          if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            push({ type: "at", extglob: true, value, output: "" });
            continue;
          }
          push({ type: "text", value });
          continue;
        }
        if (value !== "*") {
          if (value === "$" || value === "^") {
            value = `\\${value}`;
          }
          const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
          if (match) {
            value += match[0];
            state.index += match[0].length;
          }
          push({ type: "text", value });
          continue;
        }
        if (prev && (prev.type === "globstar" || prev.star === true)) {
          prev.type = "star";
          prev.star = true;
          prev.value += value;
          prev.output = star;
          state.backtrack = true;
          state.globstar = true;
          consume(value);
          continue;
        }
        let rest = remaining();
        if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
          extglobOpen("star", value);
          continue;
        }
        if (prev.type === "star") {
          if (opts.noglobstar === true) {
            consume(value);
            continue;
          }
          const prior = prev.prev;
          const before = prior.prev;
          const isStart = prior.type === "slash" || prior.type === "bos";
          const afterStar = before && (before.type === "star" || before.type === "globstar");
          if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
            push({ type: "star", value, output: "" });
            continue;
          }
          const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
          const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
          if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
            push({ type: "star", value, output: "" });
            continue;
          }
          while (rest.slice(0, 3) === "/**") {
            const after = input[state.index + 4];
            if (after && after !== "/") {
              break;
            }
            rest = rest.slice(3);
            consume("/**", 3);
          }
          if (prior.type === "bos" && eos()) {
            prev.type = "globstar";
            prev.value += value;
            prev.output = globstar(opts);
            state.output = prev.output;
            state.globstar = true;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
            prev.value += value;
            state.globstar = true;
            state.output += prior.output + prev.output;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
            const end = rest[1] !== void 0 ? "|$" : "";
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
            prev.value += value;
            state.output += prior.output + prev.output;
            state.globstar = true;
            consume(value + advance());
            push({ type: "slash", value: "/", output: "" });
            continue;
          }
          if (prior.type === "bos" && rest[0] === "/") {
            prev.type = "globstar";
            prev.value += value;
            prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
            state.output = prev.output;
            state.globstar = true;
            consume(value + advance());
            push({ type: "slash", value: "/", output: "" });
            continue;
          }
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "globstar";
          prev.output = globstar(opts);
          prev.value += value;
          state.output += prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        const token = { type: "star", value, output: star };
        if (opts.bash === true) {
          token.output = ".*?";
          if (prev.type === "bos" || prev.type === "slash") {
            token.output = nodot + token.output;
          }
          push(token);
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
          token.output = value;
          push(token);
          continue;
        }
        if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
          if (prev.type === "dot") {
            state.output += NO_DOT_SLASH;
            prev.output += NO_DOT_SLASH;
          } else if (opts.dot === true) {
            state.output += NO_DOTS_SLASH;
            prev.output += NO_DOTS_SLASH;
          } else {
            state.output += nodot;
            prev.output += nodot;
          }
          if (peek() !== "*") {
            state.output += ONE_CHAR;
            prev.output += ONE_CHAR;
          }
        }
        push(token);
      }
      while (state.brackets > 0) {
        if (opts.strictBrackets === true)
          throw new SyntaxError(syntaxError("closing", "]"));
        state.output = utils.escapeLast(state.output, "[");
        decrement("brackets");
      }
      while (state.parens > 0) {
        if (opts.strictBrackets === true)
          throw new SyntaxError(syntaxError("closing", ")"));
        state.output = utils.escapeLast(state.output, "(");
        decrement("parens");
      }
      while (state.braces > 0) {
        if (opts.strictBrackets === true)
          throw new SyntaxError(syntaxError("closing", "}"));
        state.output = utils.escapeLast(state.output, "{");
        decrement("braces");
      }
      if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
        push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
      }
      if (state.backtrack === true) {
        state.output = "";
        for (const token of state.tokens) {
          state.output += token.output != null ? token.output : token.value;
          if (token.suffix) {
            state.output += token.suffix;
          }
        }
      }
      return state;
    };
    parse.fastpaths = (input, options) => {
      const opts = { ...options };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      const len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      input = REPLACEMENTS[input] || input;
      const win32 = utils.isWindows(options);
      const {
        DOT_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOTS,
        NO_DOTS_SLASH,
        STAR,
        START_ANCHOR
      } = constants.globChars(win32);
      const nodot = opts.dot ? NO_DOTS : NO_DOT;
      const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
      const capture = opts.capture ? "" : "?:";
      const state = { negated: false, prefix: "" };
      let star = opts.bash === true ? ".*?" : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      const globstar = (opts2) => {
        if (opts2.noglobstar === true)
          return star;
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const create = (str) => {
        switch (str) {
          case "*":
            return `${nodot}${ONE_CHAR}${star}`;
          case ".*":
            return `${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*.*":
            return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*/*":
            return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
          case "**":
            return nodot + globstar(opts);
          case "**/*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
          case "**/*.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "**/.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
          default: {
            const match = /^(.*?)\.(\w+)$/.exec(str);
            if (!match)
              return;
            const source2 = create(match[1]);
            if (!source2)
              return;
            return source2 + DOT_LITERAL + match[2];
          }
        }
      };
      const output = utils.removePrefix(input, state);
      let source = create(output);
      if (source && opts.strictSlashes !== true) {
        source += `${SLASH_LITERAL}?`;
      }
      return source;
    };
    module2.exports = parse;
  }
});

// ../helpers/node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS({
  "../helpers/node_modules/picomatch/lib/picomatch.js"(exports, module2) {
    "use strict";
    var path5 = require("path");
    var scan = require_scan();
    var parse = require_parse2();
    var utils = require_utils2();
    var constants = require_constants2();
    var isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
    var picomatch = (glob, options, returnState = false) => {
      if (Array.isArray(glob)) {
        const fns = glob.map((input) => picomatch(input, options, returnState));
        const arrayMatcher = (str) => {
          for (const isMatch of fns) {
            const state2 = isMatch(str);
            if (state2)
              return state2;
          }
          return false;
        };
        return arrayMatcher;
      }
      const isState = isObject(glob) && glob.tokens && glob.input;
      if (glob === "" || typeof glob !== "string" && !isState) {
        throw new TypeError("Expected pattern to be a non-empty string");
      }
      const opts = options || {};
      const posix = utils.isWindows(options);
      const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
      const state = regex.state;
      delete regex.state;
      let isIgnored = () => false;
      if (opts.ignore) {
        const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
        isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
      }
      const matcher = (input, returnObject = false) => {
        const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
        const result = { glob, state, regex, posix, input, output, match, isMatch };
        if (typeof opts.onResult === "function") {
          opts.onResult(result);
        }
        if (isMatch === false) {
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (isIgnored(input)) {
          if (typeof opts.onIgnore === "function") {
            opts.onIgnore(result);
          }
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (typeof opts.onMatch === "function") {
          opts.onMatch(result);
        }
        return returnObject ? result : true;
      };
      if (returnState) {
        matcher.state = state;
      }
      return matcher;
    };
    picomatch.test = (input, regex, options, { glob, posix } = {}) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected input to be a string");
      }
      if (input === "") {
        return { isMatch: false, output: "" };
      }
      const opts = options || {};
      const format = opts.format || (posix ? utils.toPosixSlashes : null);
      let match = input === glob;
      let output = match && format ? format(input) : input;
      if (match === false) {
        output = format ? format(input) : input;
        match = output === glob;
      }
      if (match === false || opts.capture === true) {
        if (opts.matchBase === true || opts.basename === true) {
          match = picomatch.matchBase(input, regex, options, posix);
        } else {
          match = regex.exec(output);
        }
      }
      return { isMatch: Boolean(match), match, output };
    };
    picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
      const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
      return regex.test(path5.basename(input));
    };
    picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
    picomatch.parse = (pattern, options) => {
      if (Array.isArray(pattern))
        return pattern.map((p) => picomatch.parse(p, options));
      return parse(pattern, { ...options, fastpaths: false });
    };
    picomatch.scan = (input, options) => scan(input, options);
    picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
      if (returnOutput === true) {
        return state.output;
      }
      const opts = options || {};
      const prepend = opts.contains ? "" : "^";
      const append = opts.contains ? "" : "$";
      let source = `${prepend}(?:${state.output})${append}`;
      if (state && state.negated === true) {
        source = `^(?!${source}).*$`;
      }
      const regex = picomatch.toRegex(source, options);
      if (returnState === true) {
        regex.state = state;
      }
      return regex;
    };
    picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
      if (!input || typeof input !== "string") {
        throw new TypeError("Expected a non-empty string");
      }
      let parsed = { negated: false, fastpaths: true };
      if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
        parsed.output = parse.fastpaths(input, options);
      }
      if (!parsed.output) {
        parsed = parse(input, options);
      }
      return picomatch.compileRe(parsed, options, returnOutput, returnState);
    };
    picomatch.toRegex = (source, options) => {
      try {
        const opts = options || {};
        return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
      } catch (err) {
        if (options && options.debug === true)
          throw err;
        return /$^/;
      }
    };
    picomatch.constants = constants;
    module2.exports = picomatch;
  }
});

// ../helpers/node_modules/picomatch/index.js
var require_picomatch2 = __commonJS({
  "../helpers/node_modules/picomatch/index.js"(exports, module2) {
    "use strict";
    module2.exports = require_picomatch();
  }
});

// ../helpers/node_modules/micromatch/index.js
var require_micromatch = __commonJS({
  "../helpers/node_modules/micromatch/index.js"(exports, module2) {
    "use strict";
    var util = require("util");
    var braces = require_braces();
    var picomatch = require_picomatch2();
    var utils = require_utils2();
    var isEmptyString = (val) => val === "" || val === "./";
    var micromatch = (list, patterns, options) => {
      patterns = [].concat(patterns);
      list = [].concat(list);
      let omit = /* @__PURE__ */ new Set();
      let keep = /* @__PURE__ */ new Set();
      let items = /* @__PURE__ */ new Set();
      let negatives = 0;
      let onResult = (state) => {
        items.add(state.output);
        if (options && options.onResult) {
          options.onResult(state);
        }
      };
      for (let i = 0; i < patterns.length; i++) {
        let isMatch = picomatch(String(patterns[i]), { ...options, onResult }, true);
        let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
        if (negated)
          negatives++;
        for (let item of list) {
          let matched = isMatch(item, true);
          let match = negated ? !matched.isMatch : matched.isMatch;
          if (!match)
            continue;
          if (negated) {
            omit.add(matched.output);
          } else {
            omit.delete(matched.output);
            keep.add(matched.output);
          }
        }
      }
      let result = negatives === patterns.length ? [...items] : [...keep];
      let matches = result.filter((item) => !omit.has(item));
      if (options && matches.length === 0) {
        if (options.failglob === true) {
          throw new Error(`No matches found for "${patterns.join(", ")}"`);
        }
        if (options.nonull === true || options.nullglob === true) {
          return options.unescape ? patterns.map((p) => p.replace(/\\/g, "")) : patterns;
        }
      }
      return matches;
    };
    micromatch.match = micromatch;
    micromatch.matcher = (pattern, options) => picomatch(pattern, options);
    micromatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
    micromatch.any = micromatch.isMatch;
    micromatch.not = (list, patterns, options = {}) => {
      patterns = [].concat(patterns).map(String);
      let result = /* @__PURE__ */ new Set();
      let items = [];
      let onResult = (state) => {
        if (options.onResult)
          options.onResult(state);
        items.push(state.output);
      };
      let matches = new Set(micromatch(list, patterns, { ...options, onResult }));
      for (let item of items) {
        if (!matches.has(item)) {
          result.add(item);
        }
      }
      return [...result];
    };
    micromatch.contains = (str, pattern, options) => {
      if (typeof str !== "string") {
        throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
      }
      if (Array.isArray(pattern)) {
        return pattern.some((p) => micromatch.contains(str, p, options));
      }
      if (typeof pattern === "string") {
        if (isEmptyString(str) || isEmptyString(pattern)) {
          return false;
        }
        if (str.includes(pattern) || str.startsWith("./") && str.slice(2).includes(pattern)) {
          return true;
        }
      }
      return micromatch.isMatch(str, pattern, { ...options, contains: true });
    };
    micromatch.matchKeys = (obj, patterns, options) => {
      if (!utils.isObject(obj)) {
        throw new TypeError("Expected the first argument to be an object");
      }
      let keys = micromatch(Object.keys(obj), patterns, options);
      let res = {};
      for (let key of keys)
        res[key] = obj[key];
      return res;
    };
    micromatch.some = (list, patterns, options) => {
      let items = [].concat(list);
      for (let pattern of [].concat(patterns)) {
        let isMatch = picomatch(String(pattern), options);
        if (items.some((item) => isMatch(item))) {
          return true;
        }
      }
      return false;
    };
    micromatch.every = (list, patterns, options) => {
      let items = [].concat(list);
      for (let pattern of [].concat(patterns)) {
        let isMatch = picomatch(String(pattern), options);
        if (!items.every((item) => isMatch(item))) {
          return false;
        }
      }
      return true;
    };
    micromatch.all = (str, patterns, options) => {
      if (typeof str !== "string") {
        throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
      }
      return [].concat(patterns).every((p) => picomatch(p, options)(str));
    };
    micromatch.capture = (glob, input, options) => {
      let posix = utils.isWindows(options);
      let regex = picomatch.makeRe(String(glob), { ...options, capture: true });
      let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);
      if (match) {
        return match.slice(1).map((v) => v === void 0 ? "" : v);
      }
    };
    micromatch.makeRe = (...args) => picomatch.makeRe(...args);
    micromatch.scan = (...args) => picomatch.scan(...args);
    micromatch.parse = (patterns, options) => {
      let res = [];
      for (let pattern of [].concat(patterns || [])) {
        for (let str of braces(String(pattern), options)) {
          res.push(picomatch.parse(str, options));
        }
      }
      return res;
    };
    micromatch.braces = (pattern, options) => {
      if (typeof pattern !== "string")
        throw new TypeError("Expected a string");
      if (options && options.nobrace === true || !/\{.*\}/.test(pattern)) {
        return [pattern];
      }
      return braces(pattern, options);
    };
    micromatch.braceExpand = (pattern, options) => {
      if (typeof pattern !== "string")
        throw new TypeError("Expected a string");
      return micromatch.braces(pattern, { ...options, expand: true });
    };
    module2.exports = micromatch;
  }
});

// ../helpers/node_modules/fast-glob/out/utils/pattern.js
var require_pattern = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.matchAny = exports.convertPatternsToRe = exports.makeRe = exports.getPatternParts = exports.expandBraceExpansion = exports.expandPatternsWithBraceExpansion = exports.isAffectDepthOfReadingPattern = exports.endsWithSlashGlobStar = exports.hasGlobStar = exports.getBaseDirectory = exports.isPatternRelatedToParentDirectory = exports.getPatternsOutsideCurrentDirectory = exports.getPatternsInsideCurrentDirectory = exports.getPositivePatterns = exports.getNegativePatterns = exports.isPositivePattern = exports.isNegativePattern = exports.convertToNegativePattern = exports.convertToPositivePattern = exports.isDynamicPattern = exports.isStaticPattern = void 0;
    var path5 = require("path");
    var globParent = require_glob_parent();
    var micromatch = require_micromatch();
    var GLOBSTAR = "**";
    var ESCAPE_SYMBOL = "\\";
    var COMMON_GLOB_SYMBOLS_RE = /[*?]|^!/;
    var REGEX_CHARACTER_CLASS_SYMBOLS_RE = /\[[^[]*]/;
    var REGEX_GROUP_SYMBOLS_RE = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/;
    var GLOB_EXTENSION_SYMBOLS_RE = /[!*+?@]\([^(]*\)/;
    var BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./;
    function isStaticPattern(pattern, options = {}) {
      return !isDynamicPattern2(pattern, options);
    }
    exports.isStaticPattern = isStaticPattern;
    function isDynamicPattern2(pattern, options = {}) {
      if (pattern === "") {
        return false;
      }
      if (options.caseSensitiveMatch === false || pattern.includes(ESCAPE_SYMBOL)) {
        return true;
      }
      if (COMMON_GLOB_SYMBOLS_RE.test(pattern) || REGEX_CHARACTER_CLASS_SYMBOLS_RE.test(pattern) || REGEX_GROUP_SYMBOLS_RE.test(pattern)) {
        return true;
      }
      if (options.extglob !== false && GLOB_EXTENSION_SYMBOLS_RE.test(pattern)) {
        return true;
      }
      if (options.braceExpansion !== false && hasBraceExpansion(pattern)) {
        return true;
      }
      return false;
    }
    exports.isDynamicPattern = isDynamicPattern2;
    function hasBraceExpansion(pattern) {
      const openingBraceIndex = pattern.indexOf("{");
      if (openingBraceIndex === -1) {
        return false;
      }
      const closingBraceIndex = pattern.indexOf("}", openingBraceIndex + 1);
      if (closingBraceIndex === -1) {
        return false;
      }
      const braceContent = pattern.slice(openingBraceIndex, closingBraceIndex);
      return BRACE_EXPANSION_SEPARATORS_RE.test(braceContent);
    }
    function convertToPositivePattern(pattern) {
      return isNegativePattern2(pattern) ? pattern.slice(1) : pattern;
    }
    exports.convertToPositivePattern = convertToPositivePattern;
    function convertToNegativePattern(pattern) {
      return "!" + pattern;
    }
    exports.convertToNegativePattern = convertToNegativePattern;
    function isNegativePattern2(pattern) {
      return pattern.startsWith("!") && pattern[1] !== "(";
    }
    exports.isNegativePattern = isNegativePattern2;
    function isPositivePattern(pattern) {
      return !isNegativePattern2(pattern);
    }
    exports.isPositivePattern = isPositivePattern;
    function getNegativePatterns(patterns) {
      return patterns.filter(isNegativePattern2);
    }
    exports.getNegativePatterns = getNegativePatterns;
    function getPositivePatterns(patterns) {
      return patterns.filter(isPositivePattern);
    }
    exports.getPositivePatterns = getPositivePatterns;
    function getPatternsInsideCurrentDirectory(patterns) {
      return patterns.filter((pattern) => !isPatternRelatedToParentDirectory(pattern));
    }
    exports.getPatternsInsideCurrentDirectory = getPatternsInsideCurrentDirectory;
    function getPatternsOutsideCurrentDirectory(patterns) {
      return patterns.filter(isPatternRelatedToParentDirectory);
    }
    exports.getPatternsOutsideCurrentDirectory = getPatternsOutsideCurrentDirectory;
    function isPatternRelatedToParentDirectory(pattern) {
      return pattern.startsWith("..") || pattern.startsWith("./..");
    }
    exports.isPatternRelatedToParentDirectory = isPatternRelatedToParentDirectory;
    function getBaseDirectory(pattern) {
      return globParent(pattern, { flipBackslashes: false });
    }
    exports.getBaseDirectory = getBaseDirectory;
    function hasGlobStar(pattern) {
      return pattern.includes(GLOBSTAR);
    }
    exports.hasGlobStar = hasGlobStar;
    function endsWithSlashGlobStar(pattern) {
      return pattern.endsWith("/" + GLOBSTAR);
    }
    exports.endsWithSlashGlobStar = endsWithSlashGlobStar;
    function isAffectDepthOfReadingPattern(pattern) {
      const basename = path5.basename(pattern);
      return endsWithSlashGlobStar(pattern) || isStaticPattern(basename);
    }
    exports.isAffectDepthOfReadingPattern = isAffectDepthOfReadingPattern;
    function expandPatternsWithBraceExpansion(patterns) {
      return patterns.reduce((collection, pattern) => {
        return collection.concat(expandBraceExpansion(pattern));
      }, []);
    }
    exports.expandPatternsWithBraceExpansion = expandPatternsWithBraceExpansion;
    function expandBraceExpansion(pattern) {
      return micromatch.braces(pattern, {
        expand: true,
        nodupes: true
      });
    }
    exports.expandBraceExpansion = expandBraceExpansion;
    function getPatternParts(pattern, options) {
      let { parts } = micromatch.scan(pattern, Object.assign(Object.assign({}, options), { parts: true }));
      if (parts.length === 0) {
        parts = [pattern];
      }
      if (parts[0].startsWith("/")) {
        parts[0] = parts[0].slice(1);
        parts.unshift("");
      }
      return parts;
    }
    exports.getPatternParts = getPatternParts;
    function makeRe(pattern, options) {
      return micromatch.makeRe(pattern, options);
    }
    exports.makeRe = makeRe;
    function convertPatternsToRe(patterns, options) {
      return patterns.map((pattern) => makeRe(pattern, options));
    }
    exports.convertPatternsToRe = convertPatternsToRe;
    function matchAny(entry, patternsRe) {
      return patternsRe.some((patternRe) => patternRe.test(entry));
    }
    exports.matchAny = matchAny;
  }
});

// ../helpers/node_modules/fast-glob/out/utils/stream.js
var require_stream = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.merge = void 0;
    var merge22 = require_merge2();
    function merge(streams) {
      const mergedStream = merge22(streams);
      streams.forEach((stream) => {
        stream.once("error", (error) => mergedStream.emit("error", error));
      });
      mergedStream.once("close", () => propagateCloseEventToSources(streams));
      mergedStream.once("end", () => propagateCloseEventToSources(streams));
      return mergedStream;
    }
    exports.merge = merge;
    function propagateCloseEventToSources(streams) {
      streams.forEach((stream) => stream.emit("close"));
    }
  }
});

// ../helpers/node_modules/fast-glob/out/utils/string.js
var require_string = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isEmpty = exports.isString = void 0;
    function isString(input) {
      return typeof input === "string";
    }
    exports.isString = isString;
    function isEmpty(input) {
      return input === "";
    }
    exports.isEmpty = isEmpty;
  }
});

// ../helpers/node_modules/fast-glob/out/utils/index.js
var require_utils3 = __commonJS({
  "../helpers/node_modules/fast-glob/out/utils/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.string = exports.stream = exports.pattern = exports.path = exports.fs = exports.errno = exports.array = void 0;
    var array = require_array();
    exports.array = array;
    var errno = require_errno();
    exports.errno = errno;
    var fs4 = require_fs();
    exports.fs = fs4;
    var path5 = require_path();
    exports.path = path5;
    var pattern = require_pattern();
    exports.pattern = pattern;
    var stream = require_stream();
    exports.stream = stream;
    var string = require_string();
    exports.string = string;
  }
});

// ../helpers/node_modules/fast-glob/out/managers/tasks.js
var require_tasks = __commonJS({
  "../helpers/node_modules/fast-glob/out/managers/tasks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convertPatternGroupToTask = exports.convertPatternGroupsToTasks = exports.groupPatternsByBaseDirectory = exports.getNegativePatternsAsPositive = exports.getPositivePatterns = exports.convertPatternsToTasks = exports.generate = void 0;
    var utils = require_utils3();
    function generate(patterns, settings) {
      const positivePatterns = getPositivePatterns(patterns);
      const negativePatterns = getNegativePatternsAsPositive(patterns, settings.ignore);
      const staticPatterns = positivePatterns.filter((pattern) => utils.pattern.isStaticPattern(pattern, settings));
      const dynamicPatterns = positivePatterns.filter((pattern) => utils.pattern.isDynamicPattern(pattern, settings));
      const staticTasks = convertPatternsToTasks(
        staticPatterns,
        negativePatterns,
        /* dynamic */
        false
      );
      const dynamicTasks = convertPatternsToTasks(
        dynamicPatterns,
        negativePatterns,
        /* dynamic */
        true
      );
      return staticTasks.concat(dynamicTasks);
    }
    exports.generate = generate;
    function convertPatternsToTasks(positive, negative, dynamic) {
      const tasks = [];
      const patternsOutsideCurrentDirectory = utils.pattern.getPatternsOutsideCurrentDirectory(positive);
      const patternsInsideCurrentDirectory = utils.pattern.getPatternsInsideCurrentDirectory(positive);
      const outsideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsOutsideCurrentDirectory);
      const insideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsInsideCurrentDirectory);
      tasks.push(...convertPatternGroupsToTasks(outsideCurrentDirectoryGroup, negative, dynamic));
      if ("." in insideCurrentDirectoryGroup) {
        tasks.push(convertPatternGroupToTask(".", patternsInsideCurrentDirectory, negative, dynamic));
      } else {
        tasks.push(...convertPatternGroupsToTasks(insideCurrentDirectoryGroup, negative, dynamic));
      }
      return tasks;
    }
    exports.convertPatternsToTasks = convertPatternsToTasks;
    function getPositivePatterns(patterns) {
      return utils.pattern.getPositivePatterns(patterns);
    }
    exports.getPositivePatterns = getPositivePatterns;
    function getNegativePatternsAsPositive(patterns, ignore) {
      const negative = utils.pattern.getNegativePatterns(patterns).concat(ignore);
      const positive = negative.map(utils.pattern.convertToPositivePattern);
      return positive;
    }
    exports.getNegativePatternsAsPositive = getNegativePatternsAsPositive;
    function groupPatternsByBaseDirectory(patterns) {
      const group = {};
      return patterns.reduce((collection, pattern) => {
        const base = utils.pattern.getBaseDirectory(pattern);
        if (base in collection) {
          collection[base].push(pattern);
        } else {
          collection[base] = [pattern];
        }
        return collection;
      }, group);
    }
    exports.groupPatternsByBaseDirectory = groupPatternsByBaseDirectory;
    function convertPatternGroupsToTasks(positive, negative, dynamic) {
      return Object.keys(positive).map((base) => {
        return convertPatternGroupToTask(base, positive[base], negative, dynamic);
      });
    }
    exports.convertPatternGroupsToTasks = convertPatternGroupsToTasks;
    function convertPatternGroupToTask(base, positive, negative, dynamic) {
      return {
        dynamic,
        positive,
        negative,
        base,
        patterns: [].concat(positive, negative.map(utils.pattern.convertToNegativePattern))
      };
    }
    exports.convertPatternGroupToTask = convertPatternGroupToTask;
  }
});

// ../helpers/node_modules/fast-glob/out/managers/patterns.js
var require_patterns = __commonJS({
  "../helpers/node_modules/fast-glob/out/managers/patterns.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeDuplicateSlashes = exports.transform = void 0;
    var DOUBLE_SLASH_RE = /(?!^)\/{2,}/g;
    function transform(patterns) {
      return patterns.map((pattern) => removeDuplicateSlashes(pattern));
    }
    exports.transform = transform;
    function removeDuplicateSlashes(pattern) {
      return pattern.replace(DOUBLE_SLASH_RE, "/");
    }
    exports.removeDuplicateSlashes = removeDuplicateSlashes;
  }
});

// ../helpers/node_modules/@nodelib/fs.stat/out/providers/async.js
var require_async = __commonJS({
  "../helpers/node_modules/@nodelib/fs.stat/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.read = void 0;
    function read(path5, settings, callback) {
      settings.fs.lstat(path5, (lstatError, lstat) => {
        if (lstatError !== null) {
          callFailureCallback(callback, lstatError);
          return;
        }
        if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
          callSuccessCallback(callback, lstat);
          return;
        }
        settings.fs.stat(path5, (statError, stat) => {
          if (statError !== null) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              callFailureCallback(callback, statError);
              return;
            }
            callSuccessCallback(callback, lstat);
            return;
          }
          if (settings.markSymbolicLink) {
            stat.isSymbolicLink = () => true;
          }
          callSuccessCallback(callback, stat);
        });
      });
    }
    exports.read = read;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, result) {
      callback(null, result);
    }
  }
});

// ../helpers/node_modules/@nodelib/fs.stat/out/providers/sync.js
var require_sync = __commonJS({
  "../helpers/node_modules/@nodelib/fs.stat/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.read = void 0;
    function read(path5, settings) {
      const lstat = settings.fs.lstatSync(path5);
      if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
        return lstat;
      }
      try {
        const stat = settings.fs.statSync(path5);
        if (settings.markSymbolicLink) {
          stat.isSymbolicLink = () => true;
        }
        return stat;
      } catch (error) {
        if (!settings.throwErrorOnBrokenSymbolicLink) {
          return lstat;
        }
        throw error;
      }
    }
    exports.read = read;
  }
});

// ../helpers/node_modules/@nodelib/fs.stat/out/adapters/fs.js
var require_fs2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.stat/out/adapters/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
    var fs4 = require("fs");
    exports.FILE_SYSTEM_ADAPTER = {
      lstat: fs4.lstat,
      stat: fs4.stat,
      lstatSync: fs4.lstatSync,
      statSync: fs4.statSync
    };
    function createFileSystemAdapter(fsMethods) {
      if (fsMethods === void 0) {
        return exports.FILE_SYSTEM_ADAPTER;
      }
      return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
    }
    exports.createFileSystemAdapter = createFileSystemAdapter;
  }
});

// ../helpers/node_modules/@nodelib/fs.stat/out/settings.js
var require_settings = __commonJS({
  "../helpers/node_modules/@nodelib/fs.stat/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs4 = require_fs2();
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, true);
        this.fs = fs4.createFileSystemAdapter(this._options.fs);
        this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
      }
      _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
      }
    };
    exports.default = Settings;
  }
});

// ../helpers/node_modules/@nodelib/fs.stat/out/index.js
var require_out = __commonJS({
  "../helpers/node_modules/@nodelib/fs.stat/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.statSync = exports.stat = exports.Settings = void 0;
    var async = require_async();
    var sync = require_sync();
    var settings_1 = require_settings();
    exports.Settings = settings_1.default;
    function stat(path5, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback === "function") {
        async.read(path5, getSettings(), optionsOrSettingsOrCallback);
        return;
      }
      async.read(path5, getSettings(optionsOrSettingsOrCallback), callback);
    }
    exports.stat = stat;
    function statSync2(path5, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      return sync.read(path5, settings);
    }
    exports.statSync = statSync2;
    function getSettings(settingsOrOptions = {}) {
      if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
      }
      return new settings_1.default(settingsOrOptions);
    }
  }
});

// ../helpers/node_modules/queue-microtask/index.js
var require_queue_microtask = __commonJS({
  "../helpers/node_modules/queue-microtask/index.js"(exports, module2) {
    var promise;
    module2.exports = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : global) : (cb) => (promise || (promise = Promise.resolve())).then(cb).catch((err) => setTimeout(() => {
      throw err;
    }, 0));
  }
});

// ../helpers/node_modules/run-parallel/index.js
var require_run_parallel = __commonJS({
  "../helpers/node_modules/run-parallel/index.js"(exports, module2) {
    module2.exports = runParallel;
    var queueMicrotask2 = require_queue_microtask();
    function runParallel(tasks, cb) {
      let results, pending, keys;
      let isSync = true;
      if (Array.isArray(tasks)) {
        results = [];
        pending = tasks.length;
      } else {
        keys = Object.keys(tasks);
        results = {};
        pending = keys.length;
      }
      function done(err) {
        function end() {
          if (cb)
            cb(err, results);
          cb = null;
        }
        if (isSync)
          queueMicrotask2(end);
        else
          end();
      }
      function each(i, err, result) {
        results[i] = result;
        if (--pending === 0 || err) {
          done(err);
        }
      }
      if (!pending) {
        done(null);
      } else if (keys) {
        keys.forEach(function(key) {
          tasks[key](function(err, result) {
            each(key, err, result);
          });
        });
      } else {
        tasks.forEach(function(task, i) {
          task(function(err, result) {
            each(i, err, result);
          });
        });
      }
      isSync = false;
    }
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/constants.js
var require_constants3 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
    var NODE_PROCESS_VERSION_PARTS = process.versions.node.split(".");
    if (NODE_PROCESS_VERSION_PARTS[0] === void 0 || NODE_PROCESS_VERSION_PARTS[1] === void 0) {
      throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
    }
    var MAJOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[0], 10);
    var MINOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[1], 10);
    var SUPPORTED_MAJOR_VERSION = 10;
    var SUPPORTED_MINOR_VERSION = 10;
    var IS_MATCHED_BY_MAJOR = MAJOR_VERSION > SUPPORTED_MAJOR_VERSION;
    var IS_MATCHED_BY_MAJOR_AND_MINOR = MAJOR_VERSION === SUPPORTED_MAJOR_VERSION && MINOR_VERSION >= SUPPORTED_MINOR_VERSION;
    exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = IS_MATCHED_BY_MAJOR || IS_MATCHED_BY_MAJOR_AND_MINOR;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/utils/fs.js
var require_fs3 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/utils/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDirentFromStats = void 0;
    var DirentFromStats = class {
      constructor(name, stats) {
        this.name = name;
        this.isBlockDevice = stats.isBlockDevice.bind(stats);
        this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
        this.isDirectory = stats.isDirectory.bind(stats);
        this.isFIFO = stats.isFIFO.bind(stats);
        this.isFile = stats.isFile.bind(stats);
        this.isSocket = stats.isSocket.bind(stats);
        this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
      }
    };
    function createDirentFromStats(name, stats) {
      return new DirentFromStats(name, stats);
    }
    exports.createDirentFromStats = createDirentFromStats;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/utils/index.js
var require_utils4 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/utils/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fs = void 0;
    var fs4 = require_fs3();
    exports.fs = fs4;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/providers/common.js
var require_common = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/providers/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.joinPathSegments = void 0;
    function joinPathSegments(a, b, separator) {
      if (a.endsWith(separator)) {
        return a + b;
      }
      return a + separator + b;
    }
    exports.joinPathSegments = joinPathSegments;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/providers/async.js
var require_async2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
    var fsStat = require_out();
    var rpl = require_run_parallel();
    var constants_1 = require_constants3();
    var utils = require_utils4();
    var common = require_common();
    function read(directory, settings, callback) {
      if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        readdirWithFileTypes(directory, settings, callback);
        return;
      }
      readdir(directory, settings, callback);
    }
    exports.read = read;
    function readdirWithFileTypes(directory, settings, callback) {
      settings.fs.readdir(directory, { withFileTypes: true }, (readdirError, dirents) => {
        if (readdirError !== null) {
          callFailureCallback(callback, readdirError);
          return;
        }
        const entries = dirents.map((dirent) => ({
          dirent,
          name: dirent.name,
          path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        }));
        if (!settings.followSymbolicLinks) {
          callSuccessCallback(callback, entries);
          return;
        }
        const tasks = entries.map((entry) => makeRplTaskEntry(entry, settings));
        rpl(tasks, (rplError, rplEntries) => {
          if (rplError !== null) {
            callFailureCallback(callback, rplError);
            return;
          }
          callSuccessCallback(callback, rplEntries);
        });
      });
    }
    exports.readdirWithFileTypes = readdirWithFileTypes;
    function makeRplTaskEntry(entry, settings) {
      return (done) => {
        if (!entry.dirent.isSymbolicLink()) {
          done(null, entry);
          return;
        }
        settings.fs.stat(entry.path, (statError, stats) => {
          if (statError !== null) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              done(statError);
              return;
            }
            done(null, entry);
            return;
          }
          entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
          done(null, entry);
        });
      };
    }
    function readdir(directory, settings, callback) {
      settings.fs.readdir(directory, (readdirError, names) => {
        if (readdirError !== null) {
          callFailureCallback(callback, readdirError);
          return;
        }
        const tasks = names.map((name) => {
          const path5 = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
          return (done) => {
            fsStat.stat(path5, settings.fsStatSettings, (error, stats) => {
              if (error !== null) {
                done(error);
                return;
              }
              const entry = {
                name,
                path: path5,
                dirent: utils.fs.createDirentFromStats(name, stats)
              };
              if (settings.stats) {
                entry.stats = stats;
              }
              done(null, entry);
            });
          };
        });
        rpl(tasks, (rplError, entries) => {
          if (rplError !== null) {
            callFailureCallback(callback, rplError);
            return;
          }
          callSuccessCallback(callback, entries);
        });
      });
    }
    exports.readdir = readdir;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, result) {
      callback(null, result);
    }
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/providers/sync.js
var require_sync2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
    var fsStat = require_out();
    var constants_1 = require_constants3();
    var utils = require_utils4();
    var common = require_common();
    function read(directory, settings) {
      if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        return readdirWithFileTypes(directory, settings);
      }
      return readdir(directory, settings);
    }
    exports.read = read;
    function readdirWithFileTypes(directory, settings) {
      const dirents = settings.fs.readdirSync(directory, { withFileTypes: true });
      return dirents.map((dirent) => {
        const entry = {
          dirent,
          name: dirent.name,
          path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        };
        if (entry.dirent.isSymbolicLink() && settings.followSymbolicLinks) {
          try {
            const stats = settings.fs.statSync(entry.path);
            entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
          } catch (error) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              throw error;
            }
          }
        }
        return entry;
      });
    }
    exports.readdirWithFileTypes = readdirWithFileTypes;
    function readdir(directory, settings) {
      const names = settings.fs.readdirSync(directory);
      return names.map((name) => {
        const entryPath = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
        const stats = fsStat.statSync(entryPath, settings.fsStatSettings);
        const entry = {
          name,
          path: entryPath,
          dirent: utils.fs.createDirentFromStats(name, stats)
        };
        if (settings.stats) {
          entry.stats = stats;
        }
        return entry;
      });
    }
    exports.readdir = readdir;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/adapters/fs.js
var require_fs4 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/adapters/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
    var fs4 = require("fs");
    exports.FILE_SYSTEM_ADAPTER = {
      lstat: fs4.lstat,
      stat: fs4.stat,
      lstatSync: fs4.lstatSync,
      statSync: fs4.statSync,
      readdir: fs4.readdir,
      readdirSync: fs4.readdirSync
    };
    function createFileSystemAdapter(fsMethods) {
      if (fsMethods === void 0) {
        return exports.FILE_SYSTEM_ADAPTER;
      }
      return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
    }
    exports.createFileSystemAdapter = createFileSystemAdapter;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/settings.js
var require_settings2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path5 = require("path");
    var fsStat = require_out();
    var fs4 = require_fs4();
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, false);
        this.fs = fs4.createFileSystemAdapter(this._options.fs);
        this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path5.sep);
        this.stats = this._getValue(this._options.stats, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
        this.fsStatSettings = new fsStat.Settings({
          followSymbolicLink: this.followSymbolicLinks,
          fs: this.fs,
          throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
        });
      }
      _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
      }
    };
    exports.default = Settings;
  }
});

// ../helpers/node_modules/@nodelib/fs.scandir/out/index.js
var require_out2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.scandir/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Settings = exports.scandirSync = exports.scandir = void 0;
    var async = require_async2();
    var sync = require_sync2();
    var settings_1 = require_settings2();
    exports.Settings = settings_1.default;
    function scandir(path5, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback === "function") {
        async.read(path5, getSettings(), optionsOrSettingsOrCallback);
        return;
      }
      async.read(path5, getSettings(optionsOrSettingsOrCallback), callback);
    }
    exports.scandir = scandir;
    function scandirSync(path5, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      return sync.read(path5, settings);
    }
    exports.scandirSync = scandirSync;
    function getSettings(settingsOrOptions = {}) {
      if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
      }
      return new settings_1.default(settingsOrOptions);
    }
  }
});

// ../helpers/node_modules/reusify/reusify.js
var require_reusify = __commonJS({
  "../helpers/node_modules/reusify/reusify.js"(exports, module2) {
    "use strict";
    function reusify(Constructor) {
      var head = new Constructor();
      var tail = head;
      function get() {
        var current = head;
        if (current.next) {
          head = current.next;
        } else {
          head = new Constructor();
          tail = head;
        }
        current.next = null;
        return current;
      }
      function release(obj) {
        tail.next = obj;
        tail = obj;
      }
      return {
        get,
        release
      };
    }
    module2.exports = reusify;
  }
});

// ../helpers/node_modules/fastq/queue.js
var require_queue = __commonJS({
  "../helpers/node_modules/fastq/queue.js"(exports, module2) {
    "use strict";
    var reusify = require_reusify();
    function fastqueue(context, worker, concurrency) {
      if (typeof context === "function") {
        concurrency = worker;
        worker = context;
        context = null;
      }
      if (concurrency < 1) {
        throw new Error("fastqueue concurrency must be greater than 1");
      }
      var cache = reusify(Task2);
      var queueHead = null;
      var queueTail = null;
      var _running = 0;
      var errorHandler = null;
      var self = {
        push,
        drain: noop,
        saturated: noop,
        pause,
        paused: false,
        concurrency,
        running,
        resume,
        idle,
        length,
        getQueue,
        unshift,
        empty: noop,
        kill,
        killAndDrain,
        error
      };
      return self;
      function running() {
        return _running;
      }
      function pause() {
        self.paused = true;
      }
      function length() {
        var current = queueHead;
        var counter = 0;
        while (current) {
          current = current.next;
          counter++;
        }
        return counter;
      }
      function getQueue() {
        var current = queueHead;
        var tasks = [];
        while (current) {
          tasks.push(current.value);
          current = current.next;
        }
        return tasks;
      }
      function resume() {
        if (!self.paused)
          return;
        self.paused = false;
        for (var i = 0; i < self.concurrency; i++) {
          _running++;
          release();
        }
      }
      function idle() {
        return _running === 0 && self.length() === 0;
      }
      function push(value, done) {
        var current = cache.get();
        current.context = context;
        current.release = release;
        current.value = value;
        current.callback = done || noop;
        current.errorHandler = errorHandler;
        if (_running === self.concurrency || self.paused) {
          if (queueTail) {
            queueTail.next = current;
            queueTail = current;
          } else {
            queueHead = current;
            queueTail = current;
            self.saturated();
          }
        } else {
          _running++;
          worker.call(context, current.value, current.worked);
        }
      }
      function unshift(value, done) {
        var current = cache.get();
        current.context = context;
        current.release = release;
        current.value = value;
        current.callback = done || noop;
        if (_running === self.concurrency || self.paused) {
          if (queueHead) {
            current.next = queueHead;
            queueHead = current;
          } else {
            queueHead = current;
            queueTail = current;
            self.saturated();
          }
        } else {
          _running++;
          worker.call(context, current.value, current.worked);
        }
      }
      function release(holder) {
        if (holder) {
          cache.release(holder);
        }
        var next = queueHead;
        if (next) {
          if (!self.paused) {
            if (queueTail === queueHead) {
              queueTail = null;
            }
            queueHead = next.next;
            next.next = null;
            worker.call(context, next.value, next.worked);
            if (queueTail === null) {
              self.empty();
            }
          } else {
            _running--;
          }
        } else if (--_running === 0) {
          self.drain();
        }
      }
      function kill() {
        queueHead = null;
        queueTail = null;
        self.drain = noop;
      }
      function killAndDrain() {
        queueHead = null;
        queueTail = null;
        self.drain();
        self.drain = noop;
      }
      function error(handler) {
        errorHandler = handler;
      }
    }
    function noop() {
    }
    function Task2() {
      this.value = null;
      this.callback = noop;
      this.next = null;
      this.release = noop;
      this.context = null;
      this.errorHandler = null;
      var self = this;
      this.worked = function worked(err, result) {
        var callback = self.callback;
        var errorHandler = self.errorHandler;
        var val = self.value;
        self.value = null;
        self.callback = noop;
        if (self.errorHandler) {
          errorHandler(err, val);
        }
        callback.call(self.context, err, result);
        self.release(self);
      };
    }
    function queueAsPromised(context, worker, concurrency) {
      if (typeof context === "function") {
        concurrency = worker;
        worker = context;
        context = null;
      }
      function asyncWrapper(arg, cb) {
        worker.call(this, arg).then(function(res) {
          cb(null, res);
        }, cb);
      }
      var queue = fastqueue(context, asyncWrapper, concurrency);
      var pushCb = queue.push;
      var unshiftCb = queue.unshift;
      queue.push = push;
      queue.unshift = unshift;
      queue.drained = drained;
      return queue;
      function push(value) {
        var p = new Promise(function(resolve, reject) {
          pushCb(value, function(err, result) {
            if (err) {
              reject(err);
              return;
            }
            resolve(result);
          });
        });
        p.catch(noop);
        return p;
      }
      function unshift(value) {
        var p = new Promise(function(resolve, reject) {
          unshiftCb(value, function(err, result) {
            if (err) {
              reject(err);
              return;
            }
            resolve(result);
          });
        });
        p.catch(noop);
        return p;
      }
      function drained() {
        if (queue.idle()) {
          return new Promise(function(resolve) {
            resolve();
          });
        }
        var previousDrain = queue.drain;
        var p = new Promise(function(resolve) {
          queue.drain = function() {
            previousDrain();
            resolve();
          };
        });
        return p;
      }
    }
    module2.exports = fastqueue;
    module2.exports.promise = queueAsPromised;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/readers/common.js
var require_common2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/readers/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.joinPathSegments = exports.replacePathSegmentSeparator = exports.isAppliedFilter = exports.isFatalError = void 0;
    function isFatalError(settings, error) {
      if (settings.errorFilter === null) {
        return true;
      }
      return !settings.errorFilter(error);
    }
    exports.isFatalError = isFatalError;
    function isAppliedFilter(filter, value) {
      return filter === null || filter(value);
    }
    exports.isAppliedFilter = isAppliedFilter;
    function replacePathSegmentSeparator(filepath, separator) {
      return filepath.split(/[/\\]/).join(separator);
    }
    exports.replacePathSegmentSeparator = replacePathSegmentSeparator;
    function joinPathSegments(a, b, separator) {
      if (a === "") {
        return b;
      }
      if (a.endsWith(separator)) {
        return a + b;
      }
      return a + separator + b;
    }
    exports.joinPathSegments = joinPathSegments;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/readers/reader.js
var require_reader = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/readers/reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var common = require_common2();
    var Reader = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._root = common.replacePathSegmentSeparator(_root, _settings.pathSegmentSeparator);
      }
    };
    exports.default = Reader;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/readers/async.js
var require_async3 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/readers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var events_1 = require("events");
    var fsScandir = require_out2();
    var fastq = require_queue();
    var common = require_common2();
    var reader_1 = require_reader();
    var AsyncReader = class extends reader_1.default {
      constructor(_root, _settings) {
        super(_root, _settings);
        this._settings = _settings;
        this._scandir = fsScandir.scandir;
        this._emitter = new events_1.EventEmitter();
        this._queue = fastq(this._worker.bind(this), this._settings.concurrency);
        this._isFatalError = false;
        this._isDestroyed = false;
        this._queue.drain = () => {
          if (!this._isFatalError) {
            this._emitter.emit("end");
          }
        };
      }
      read() {
        this._isFatalError = false;
        this._isDestroyed = false;
        setImmediate(() => {
          this._pushToQueue(this._root, this._settings.basePath);
        });
        return this._emitter;
      }
      get isDestroyed() {
        return this._isDestroyed;
      }
      destroy() {
        if (this._isDestroyed) {
          throw new Error("The reader is already destroyed");
        }
        this._isDestroyed = true;
        this._queue.killAndDrain();
      }
      onEntry(callback) {
        this._emitter.on("entry", callback);
      }
      onError(callback) {
        this._emitter.once("error", callback);
      }
      onEnd(callback) {
        this._emitter.once("end", callback);
      }
      _pushToQueue(directory, base) {
        const queueItem = { directory, base };
        this._queue.push(queueItem, (error) => {
          if (error !== null) {
            this._handleError(error);
          }
        });
      }
      _worker(item, done) {
        this._scandir(item.directory, this._settings.fsScandirSettings, (error, entries) => {
          if (error !== null) {
            done(error, void 0);
            return;
          }
          for (const entry of entries) {
            this._handleEntry(entry, item.base);
          }
          done(null, void 0);
        });
      }
      _handleError(error) {
        if (this._isDestroyed || !common.isFatalError(this._settings, error)) {
          return;
        }
        this._isFatalError = true;
        this._isDestroyed = true;
        this._emitter.emit("error", error);
      }
      _handleEntry(entry, base) {
        if (this._isDestroyed || this._isFatalError) {
          return;
        }
        const fullpath = entry.path;
        if (base !== void 0) {
          entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
        }
        if (common.isAppliedFilter(this._settings.entryFilter, entry)) {
          this._emitEntry(entry);
        }
        if (entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry)) {
          this._pushToQueue(fullpath, base === void 0 ? void 0 : entry.path);
        }
      }
      _emitEntry(entry) {
        this._emitter.emit("entry", entry);
      }
    };
    exports.default = AsyncReader;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/providers/async.js
var require_async4 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var async_1 = require_async3();
    var AsyncProvider = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new async_1.default(this._root, this._settings);
        this._storage = [];
      }
      read(callback) {
        this._reader.onError((error) => {
          callFailureCallback(callback, error);
        });
        this._reader.onEntry((entry) => {
          this._storage.push(entry);
        });
        this._reader.onEnd(() => {
          callSuccessCallback(callback, this._storage);
        });
        this._reader.read();
      }
    };
    exports.default = AsyncProvider;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, entries) {
      callback(null, entries);
    }
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/providers/stream.js
var require_stream2 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/providers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var stream_1 = require("stream");
    var async_1 = require_async3();
    var StreamProvider = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new async_1.default(this._root, this._settings);
        this._stream = new stream_1.Readable({
          objectMode: true,
          read: () => {
          },
          destroy: () => {
            if (!this._reader.isDestroyed) {
              this._reader.destroy();
            }
          }
        });
      }
      read() {
        this._reader.onError((error) => {
          this._stream.emit("error", error);
        });
        this._reader.onEntry((entry) => {
          this._stream.push(entry);
        });
        this._reader.onEnd(() => {
          this._stream.push(null);
        });
        this._reader.read();
        return this._stream;
      }
    };
    exports.default = StreamProvider;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/readers/sync.js
var require_sync3 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/readers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fsScandir = require_out2();
    var common = require_common2();
    var reader_1 = require_reader();
    var SyncReader = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._scandir = fsScandir.scandirSync;
        this._storage = [];
        this._queue = /* @__PURE__ */ new Set();
      }
      read() {
        this._pushToQueue(this._root, this._settings.basePath);
        this._handleQueue();
        return this._storage;
      }
      _pushToQueue(directory, base) {
        this._queue.add({ directory, base });
      }
      _handleQueue() {
        for (const item of this._queue.values()) {
          this._handleDirectory(item.directory, item.base);
        }
      }
      _handleDirectory(directory, base) {
        try {
          const entries = this._scandir(directory, this._settings.fsScandirSettings);
          for (const entry of entries) {
            this._handleEntry(entry, base);
          }
        } catch (error) {
          this._handleError(error);
        }
      }
      _handleError(error) {
        if (!common.isFatalError(this._settings, error)) {
          return;
        }
        throw error;
      }
      _handleEntry(entry, base) {
        const fullpath = entry.path;
        if (base !== void 0) {
          entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
        }
        if (common.isAppliedFilter(this._settings.entryFilter, entry)) {
          this._pushToStorage(entry);
        }
        if (entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry)) {
          this._pushToQueue(fullpath, base === void 0 ? void 0 : entry.path);
        }
      }
      _pushToStorage(entry) {
        this._storage.push(entry);
      }
    };
    exports.default = SyncReader;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/providers/sync.js
var require_sync4 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sync_1 = require_sync3();
    var SyncProvider = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new sync_1.default(this._root, this._settings);
      }
      read() {
        return this._reader.read();
      }
    };
    exports.default = SyncProvider;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/settings.js
var require_settings3 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path5 = require("path");
    var fsScandir = require_out2();
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.basePath = this._getValue(this._options.basePath, void 0);
        this.concurrency = this._getValue(this._options.concurrency, Number.POSITIVE_INFINITY);
        this.deepFilter = this._getValue(this._options.deepFilter, null);
        this.entryFilter = this._getValue(this._options.entryFilter, null);
        this.errorFilter = this._getValue(this._options.errorFilter, null);
        this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path5.sep);
        this.fsScandirSettings = new fsScandir.Settings({
          followSymbolicLinks: this._options.followSymbolicLinks,
          fs: this._options.fs,
          pathSegmentSeparator: this._options.pathSegmentSeparator,
          stats: this._options.stats,
          throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink
        });
      }
      _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
      }
    };
    exports.default = Settings;
  }
});

// ../helpers/node_modules/@nodelib/fs.walk/out/index.js
var require_out3 = __commonJS({
  "../helpers/node_modules/@nodelib/fs.walk/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Settings = exports.walkStream = exports.walkSync = exports.walk = void 0;
    var async_1 = require_async4();
    var stream_1 = require_stream2();
    var sync_1 = require_sync4();
    var settings_1 = require_settings3();
    exports.Settings = settings_1.default;
    function walk(directory, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback === "function") {
        new async_1.default(directory, getSettings()).read(optionsOrSettingsOrCallback);
        return;
      }
      new async_1.default(directory, getSettings(optionsOrSettingsOrCallback)).read(callback);
    }
    exports.walk = walk;
    function walkSync(directory, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      const provider = new sync_1.default(directory, settings);
      return provider.read();
    }
    exports.walkSync = walkSync;
    function walkStream(directory, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      const provider = new stream_1.default(directory, settings);
      return provider.read();
    }
    exports.walkStream = walkStream;
    function getSettings(settingsOrOptions = {}) {
      if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
      }
      return new settings_1.default(settingsOrOptions);
    }
  }
});

// ../helpers/node_modules/fast-glob/out/readers/reader.js
var require_reader2 = __commonJS({
  "../helpers/node_modules/fast-glob/out/readers/reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path5 = require("path");
    var fsStat = require_out();
    var utils = require_utils3();
    var Reader = class {
      constructor(_settings) {
        this._settings = _settings;
        this._fsStatSettings = new fsStat.Settings({
          followSymbolicLink: this._settings.followSymbolicLinks,
          fs: this._settings.fs,
          throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
        });
      }
      _getFullEntryPath(filepath) {
        return path5.resolve(this._settings.cwd, filepath);
      }
      _makeEntry(stats, pattern) {
        const entry = {
          name: pattern,
          path: pattern,
          dirent: utils.fs.createDirentFromStats(pattern, stats)
        };
        if (this._settings.stats) {
          entry.stats = stats;
        }
        return entry;
      }
      _isFatalError(error) {
        return !utils.errno.isEnoentCodeError(error) && !this._settings.suppressErrors;
      }
    };
    exports.default = Reader;
  }
});

// ../helpers/node_modules/fast-glob/out/readers/stream.js
var require_stream3 = __commonJS({
  "../helpers/node_modules/fast-glob/out/readers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var stream_1 = require("stream");
    var fsStat = require_out();
    var fsWalk = require_out3();
    var reader_1 = require_reader2();
    var ReaderStream = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._walkStream = fsWalk.walkStream;
        this._stat = fsStat.stat;
      }
      dynamic(root, options) {
        return this._walkStream(root, options);
      }
      static(patterns, options) {
        const filepaths = patterns.map(this._getFullEntryPath, this);
        const stream = new stream_1.PassThrough({ objectMode: true });
        stream._write = (index, _enc, done) => {
          return this._getEntry(filepaths[index], patterns[index], options).then((entry) => {
            if (entry !== null && options.entryFilter(entry)) {
              stream.push(entry);
            }
            if (index === filepaths.length - 1) {
              stream.end();
            }
            done();
          }).catch(done);
        };
        for (let i = 0; i < filepaths.length; i++) {
          stream.write(i);
        }
        return stream;
      }
      _getEntry(filepath, pattern, options) {
        return this._getStat(filepath).then((stats) => this._makeEntry(stats, pattern)).catch((error) => {
          if (options.errorFilter(error)) {
            return null;
          }
          throw error;
        });
      }
      _getStat(filepath) {
        return new Promise((resolve, reject) => {
          this._stat(filepath, this._fsStatSettings, (error, stats) => {
            return error === null ? resolve(stats) : reject(error);
          });
        });
      }
    };
    exports.default = ReaderStream;
  }
});

// ../helpers/node_modules/fast-glob/out/readers/async.js
var require_async5 = __commonJS({
  "../helpers/node_modules/fast-glob/out/readers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fsWalk = require_out3();
    var reader_1 = require_reader2();
    var stream_1 = require_stream3();
    var ReaderAsync = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._walkAsync = fsWalk.walk;
        this._readerStream = new stream_1.default(this._settings);
      }
      dynamic(root, options) {
        return new Promise((resolve, reject) => {
          this._walkAsync(root, options, (error, entries) => {
            if (error === null) {
              resolve(entries);
            } else {
              reject(error);
            }
          });
        });
      }
      async static(patterns, options) {
        const entries = [];
        const stream = this._readerStream.static(patterns, options);
        return new Promise((resolve, reject) => {
          stream.once("error", reject);
          stream.on("data", (entry) => entries.push(entry));
          stream.once("end", () => resolve(entries));
        });
      }
    };
    exports.default = ReaderAsync;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/matchers/matcher.js
var require_matcher = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/matchers/matcher.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var Matcher = class {
      constructor(_patterns, _settings, _micromatchOptions) {
        this._patterns = _patterns;
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
        this._storage = [];
        this._fillStorage();
      }
      _fillStorage() {
        const patterns = utils.pattern.expandPatternsWithBraceExpansion(this._patterns);
        for (const pattern of patterns) {
          const segments = this._getPatternSegments(pattern);
          const sections = this._splitSegmentsIntoSections(segments);
          this._storage.push({
            complete: sections.length <= 1,
            pattern,
            segments,
            sections
          });
        }
      }
      _getPatternSegments(pattern) {
        const parts = utils.pattern.getPatternParts(pattern, this._micromatchOptions);
        return parts.map((part) => {
          const dynamic = utils.pattern.isDynamicPattern(part, this._settings);
          if (!dynamic) {
            return {
              dynamic: false,
              pattern: part
            };
          }
          return {
            dynamic: true,
            pattern: part,
            patternRe: utils.pattern.makeRe(part, this._micromatchOptions)
          };
        });
      }
      _splitSegmentsIntoSections(segments) {
        return utils.array.splitWhen(segments, (segment) => segment.dynamic && utils.pattern.hasGlobStar(segment.pattern));
      }
    };
    exports.default = Matcher;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/matchers/partial.js
var require_partial = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/matchers/partial.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var matcher_1 = require_matcher();
    var PartialMatcher = class extends matcher_1.default {
      match(filepath) {
        const parts = filepath.split("/");
        const levels = parts.length;
        const patterns = this._storage.filter((info) => !info.complete || info.segments.length > levels);
        for (const pattern of patterns) {
          const section = pattern.sections[0];
          if (!pattern.complete && levels > section.length) {
            return true;
          }
          const match = parts.every((part, index) => {
            const segment = pattern.segments[index];
            if (segment.dynamic && segment.patternRe.test(part)) {
              return true;
            }
            if (!segment.dynamic && segment.pattern === part) {
              return true;
            }
            return false;
          });
          if (match) {
            return true;
          }
        }
        return false;
      }
    };
    exports.default = PartialMatcher;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/filters/deep.js
var require_deep = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/filters/deep.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var partial_1 = require_partial();
    var DeepFilter = class {
      constructor(_settings, _micromatchOptions) {
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
      }
      getFilter(basePath, positive, negative) {
        const matcher = this._getMatcher(positive);
        const negativeRe = this._getNegativePatternsRe(negative);
        return (entry) => this._filter(basePath, entry, matcher, negativeRe);
      }
      _getMatcher(patterns) {
        return new partial_1.default(patterns, this._settings, this._micromatchOptions);
      }
      _getNegativePatternsRe(patterns) {
        const affectDepthOfReadingPatterns = patterns.filter(utils.pattern.isAffectDepthOfReadingPattern);
        return utils.pattern.convertPatternsToRe(affectDepthOfReadingPatterns, this._micromatchOptions);
      }
      _filter(basePath, entry, matcher, negativeRe) {
        if (this._isSkippedByDeep(basePath, entry.path)) {
          return false;
        }
        if (this._isSkippedSymbolicLink(entry)) {
          return false;
        }
        const filepath = utils.path.removeLeadingDotSegment(entry.path);
        if (this._isSkippedByPositivePatterns(filepath, matcher)) {
          return false;
        }
        return this._isSkippedByNegativePatterns(filepath, negativeRe);
      }
      _isSkippedByDeep(basePath, entryPath) {
        if (this._settings.deep === Infinity) {
          return false;
        }
        return this._getEntryLevel(basePath, entryPath) >= this._settings.deep;
      }
      _getEntryLevel(basePath, entryPath) {
        const entryPathDepth = entryPath.split("/").length;
        if (basePath === "") {
          return entryPathDepth;
        }
        const basePathDepth = basePath.split("/").length;
        return entryPathDepth - basePathDepth;
      }
      _isSkippedSymbolicLink(entry) {
        return !this._settings.followSymbolicLinks && entry.dirent.isSymbolicLink();
      }
      _isSkippedByPositivePatterns(entryPath, matcher) {
        return !this._settings.baseNameMatch && !matcher.match(entryPath);
      }
      _isSkippedByNegativePatterns(entryPath, patternsRe) {
        return !utils.pattern.matchAny(entryPath, patternsRe);
      }
    };
    exports.default = DeepFilter;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/filters/entry.js
var require_entry = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/filters/entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var EntryFilter = class {
      constructor(_settings, _micromatchOptions) {
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
        this.index = /* @__PURE__ */ new Map();
      }
      getFilter(positive, negative) {
        const positiveRe = utils.pattern.convertPatternsToRe(positive, this._micromatchOptions);
        const negativeRe = utils.pattern.convertPatternsToRe(negative, this._micromatchOptions);
        return (entry) => this._filter(entry, positiveRe, negativeRe);
      }
      _filter(entry, positiveRe, negativeRe) {
        if (this._settings.unique && this._isDuplicateEntry(entry)) {
          return false;
        }
        if (this._onlyFileFilter(entry) || this._onlyDirectoryFilter(entry)) {
          return false;
        }
        if (this._isSkippedByAbsoluteNegativePatterns(entry.path, negativeRe)) {
          return false;
        }
        const filepath = this._settings.baseNameMatch ? entry.name : entry.path;
        const isDirectory = entry.dirent.isDirectory();
        const isMatched = this._isMatchToPatterns(filepath, positiveRe, isDirectory) && !this._isMatchToPatterns(entry.path, negativeRe, isDirectory);
        if (this._settings.unique && isMatched) {
          this._createIndexRecord(entry);
        }
        return isMatched;
      }
      _isDuplicateEntry(entry) {
        return this.index.has(entry.path);
      }
      _createIndexRecord(entry) {
        this.index.set(entry.path, void 0);
      }
      _onlyFileFilter(entry) {
        return this._settings.onlyFiles && !entry.dirent.isFile();
      }
      _onlyDirectoryFilter(entry) {
        return this._settings.onlyDirectories && !entry.dirent.isDirectory();
      }
      _isSkippedByAbsoluteNegativePatterns(entryPath, patternsRe) {
        if (!this._settings.absolute) {
          return false;
        }
        const fullpath = utils.path.makeAbsolute(this._settings.cwd, entryPath);
        return utils.pattern.matchAny(fullpath, patternsRe);
      }
      _isMatchToPatterns(entryPath, patternsRe, isDirectory) {
        const filepath = utils.path.removeLeadingDotSegment(entryPath);
        const isMatched = utils.pattern.matchAny(filepath, patternsRe);
        if (!isMatched && isDirectory) {
          return utils.pattern.matchAny(filepath + "/", patternsRe);
        }
        return isMatched;
      }
    };
    exports.default = EntryFilter;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/filters/error.js
var require_error = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/filters/error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var ErrorFilter = class {
      constructor(_settings) {
        this._settings = _settings;
      }
      getFilter() {
        return (error) => this._isNonFatalError(error);
      }
      _isNonFatalError(error) {
        return utils.errno.isEnoentCodeError(error) || this._settings.suppressErrors;
      }
    };
    exports.default = ErrorFilter;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/transformers/entry.js
var require_entry2 = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/transformers/entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var EntryTransformer = class {
      constructor(_settings) {
        this._settings = _settings;
      }
      getTransformer() {
        return (entry) => this._transform(entry);
      }
      _transform(entry) {
        let filepath = entry.path;
        if (this._settings.absolute) {
          filepath = utils.path.makeAbsolute(this._settings.cwd, filepath);
          filepath = utils.path.unixify(filepath);
        }
        if (this._settings.markDirectories && entry.dirent.isDirectory()) {
          filepath += "/";
        }
        if (!this._settings.objectMode) {
          return filepath;
        }
        return Object.assign(Object.assign({}, entry), { path: filepath });
      }
    };
    exports.default = EntryTransformer;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/provider.js
var require_provider = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path5 = require("path");
    var deep_1 = require_deep();
    var entry_1 = require_entry();
    var error_1 = require_error();
    var entry_2 = require_entry2();
    var Provider = class {
      constructor(_settings) {
        this._settings = _settings;
        this.errorFilter = new error_1.default(this._settings);
        this.entryFilter = new entry_1.default(this._settings, this._getMicromatchOptions());
        this.deepFilter = new deep_1.default(this._settings, this._getMicromatchOptions());
        this.entryTransformer = new entry_2.default(this._settings);
      }
      _getRootDirectory(task) {
        return path5.resolve(this._settings.cwd, task.base);
      }
      _getReaderOptions(task) {
        const basePath = task.base === "." ? "" : task.base;
        return {
          basePath,
          pathSegmentSeparator: "/",
          concurrency: this._settings.concurrency,
          deepFilter: this.deepFilter.getFilter(basePath, task.positive, task.negative),
          entryFilter: this.entryFilter.getFilter(task.positive, task.negative),
          errorFilter: this.errorFilter.getFilter(),
          followSymbolicLinks: this._settings.followSymbolicLinks,
          fs: this._settings.fs,
          stats: this._settings.stats,
          throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink,
          transform: this.entryTransformer.getTransformer()
        };
      }
      _getMicromatchOptions() {
        return {
          dot: this._settings.dot,
          matchBase: this._settings.baseNameMatch,
          nobrace: !this._settings.braceExpansion,
          nocase: !this._settings.caseSensitiveMatch,
          noext: !this._settings.extglob,
          noglobstar: !this._settings.globstar,
          posix: true,
          strictSlashes: false
        };
      }
    };
    exports.default = Provider;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/async.js
var require_async6 = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var async_1 = require_async5();
    var provider_1 = require_provider();
    var ProviderAsync = class extends provider_1.default {
      constructor() {
        super(...arguments);
        this._reader = new async_1.default(this._settings);
      }
      async read(task) {
        const root = this._getRootDirectory(task);
        const options = this._getReaderOptions(task);
        const entries = await this.api(root, task, options);
        return entries.map((entry) => options.transform(entry));
      }
      api(root, task, options) {
        if (task.dynamic) {
          return this._reader.dynamic(root, options);
        }
        return this._reader.static(task.patterns, options);
      }
    };
    exports.default = ProviderAsync;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/stream.js
var require_stream4 = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var stream_1 = require("stream");
    var stream_2 = require_stream3();
    var provider_1 = require_provider();
    var ProviderStream = class extends provider_1.default {
      constructor() {
        super(...arguments);
        this._reader = new stream_2.default(this._settings);
      }
      read(task) {
        const root = this._getRootDirectory(task);
        const options = this._getReaderOptions(task);
        const source = this.api(root, task, options);
        const destination = new stream_1.Readable({ objectMode: true, read: () => {
        } });
        source.once("error", (error) => destination.emit("error", error)).on("data", (entry) => destination.emit("data", options.transform(entry))).once("end", () => destination.emit("end"));
        destination.once("close", () => source.destroy());
        return destination;
      }
      api(root, task, options) {
        if (task.dynamic) {
          return this._reader.dynamic(root, options);
        }
        return this._reader.static(task.patterns, options);
      }
    };
    exports.default = ProviderStream;
  }
});

// ../helpers/node_modules/fast-glob/out/readers/sync.js
var require_sync5 = __commonJS({
  "../helpers/node_modules/fast-glob/out/readers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fsStat = require_out();
    var fsWalk = require_out3();
    var reader_1 = require_reader2();
    var ReaderSync = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._walkSync = fsWalk.walkSync;
        this._statSync = fsStat.statSync;
      }
      dynamic(root, options) {
        return this._walkSync(root, options);
      }
      static(patterns, options) {
        const entries = [];
        for (const pattern of patterns) {
          const filepath = this._getFullEntryPath(pattern);
          const entry = this._getEntry(filepath, pattern, options);
          if (entry === null || !options.entryFilter(entry)) {
            continue;
          }
          entries.push(entry);
        }
        return entries;
      }
      _getEntry(filepath, pattern, options) {
        try {
          const stats = this._getStat(filepath);
          return this._makeEntry(stats, pattern);
        } catch (error) {
          if (options.errorFilter(error)) {
            return null;
          }
          throw error;
        }
      }
      _getStat(filepath) {
        return this._statSync(filepath, this._fsStatSettings);
      }
    };
    exports.default = ReaderSync;
  }
});

// ../helpers/node_modules/fast-glob/out/providers/sync.js
var require_sync6 = __commonJS({
  "../helpers/node_modules/fast-glob/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sync_1 = require_sync5();
    var provider_1 = require_provider();
    var ProviderSync = class extends provider_1.default {
      constructor() {
        super(...arguments);
        this._reader = new sync_1.default(this._settings);
      }
      read(task) {
        const root = this._getRootDirectory(task);
        const options = this._getReaderOptions(task);
        const entries = this.api(root, task, options);
        return entries.map(options.transform);
      }
      api(root, task, options) {
        if (task.dynamic) {
          return this._reader.dynamic(root, options);
        }
        return this._reader.static(task.patterns, options);
      }
    };
    exports.default = ProviderSync;
  }
});

// ../helpers/node_modules/fast-glob/out/settings.js
var require_settings4 = __commonJS({
  "../helpers/node_modules/fast-glob/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
    var fs4 = require("fs");
    var os = require("os");
    var CPU_COUNT = Math.max(os.cpus().length, 1);
    exports.DEFAULT_FILE_SYSTEM_ADAPTER = {
      lstat: fs4.lstat,
      lstatSync: fs4.lstatSync,
      stat: fs4.stat,
      statSync: fs4.statSync,
      readdir: fs4.readdir,
      readdirSync: fs4.readdirSync
    };
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.absolute = this._getValue(this._options.absolute, false);
        this.baseNameMatch = this._getValue(this._options.baseNameMatch, false);
        this.braceExpansion = this._getValue(this._options.braceExpansion, true);
        this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, true);
        this.concurrency = this._getValue(this._options.concurrency, CPU_COUNT);
        this.cwd = this._getValue(this._options.cwd, process.cwd());
        this.deep = this._getValue(this._options.deep, Infinity);
        this.dot = this._getValue(this._options.dot, false);
        this.extglob = this._getValue(this._options.extglob, true);
        this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, true);
        this.fs = this._getFileSystemMethods(this._options.fs);
        this.globstar = this._getValue(this._options.globstar, true);
        this.ignore = this._getValue(this._options.ignore, []);
        this.markDirectories = this._getValue(this._options.markDirectories, false);
        this.objectMode = this._getValue(this._options.objectMode, false);
        this.onlyDirectories = this._getValue(this._options.onlyDirectories, false);
        this.onlyFiles = this._getValue(this._options.onlyFiles, true);
        this.stats = this._getValue(this._options.stats, false);
        this.suppressErrors = this._getValue(this._options.suppressErrors, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, false);
        this.unique = this._getValue(this._options.unique, true);
        if (this.onlyDirectories) {
          this.onlyFiles = false;
        }
        if (this.stats) {
          this.objectMode = true;
        }
      }
      _getValue(option, value) {
        return option === void 0 ? value : option;
      }
      _getFileSystemMethods(methods = {}) {
        return Object.assign(Object.assign({}, exports.DEFAULT_FILE_SYSTEM_ADAPTER), methods);
      }
    };
    exports.default = Settings;
  }
});

// ../helpers/node_modules/fast-glob/out/index.js
var require_out4 = __commonJS({
  "../helpers/node_modules/fast-glob/out/index.js"(exports, module2) {
    "use strict";
    var taskManager = require_tasks();
    var patternManager = require_patterns();
    var async_1 = require_async6();
    var stream_1 = require_stream4();
    var sync_1 = require_sync6();
    var settings_1 = require_settings4();
    var utils = require_utils3();
    async function FastGlob(source, options) {
      assertPatternsInput2(source);
      const works = getWorks(source, async_1.default, options);
      const result = await Promise.all(works);
      return utils.array.flatten(result);
    }
    (function(FastGlob2) {
      function sync(source, options) {
        assertPatternsInput2(source);
        const works = getWorks(source, sync_1.default, options);
        return utils.array.flatten(works);
      }
      FastGlob2.sync = sync;
      function stream(source, options) {
        assertPatternsInput2(source);
        const works = getWorks(source, stream_1.default, options);
        return utils.stream.merge(works);
      }
      FastGlob2.stream = stream;
      function generateTasks2(source, options) {
        assertPatternsInput2(source);
        const patterns = patternManager.transform([].concat(source));
        const settings = new settings_1.default(options);
        return taskManager.generate(patterns, settings);
      }
      FastGlob2.generateTasks = generateTasks2;
      function isDynamicPattern2(source, options) {
        assertPatternsInput2(source);
        const settings = new settings_1.default(options);
        return utils.pattern.isDynamicPattern(source, settings);
      }
      FastGlob2.isDynamicPattern = isDynamicPattern2;
      function escapePath(source) {
        assertPatternsInput2(source);
        return utils.path.escape(source);
      }
      FastGlob2.escapePath = escapePath;
    })(FastGlob || (FastGlob = {}));
    function getWorks(source, _Provider, options) {
      const patterns = patternManager.transform([].concat(source));
      const settings = new settings_1.default(options);
      const tasks = taskManager.generate(patterns, settings);
      const provider = new _Provider(settings);
      return tasks.map(provider.read, provider);
    }
    function assertPatternsInput2(input) {
      const source = [].concat(input);
      const isValidSource = source.every((item) => utils.string.isString(item) && !utils.string.isEmpty(item));
      if (!isValidSource) {
        throw new TypeError("Patterns must be a string (non empty) or an array of strings");
      }
    }
    module2.exports = FastGlob;
  }
});

// ../helpers/node_modules/path-type/index.js
var require_path_type = __commonJS({
  "../helpers/node_modules/path-type/index.js"(exports) {
    "use strict";
    var { promisify } = require("util");
    var fs4 = require("fs");
    async function isType(fsStatType, statsMethodName, filePath) {
      if (typeof filePath !== "string") {
        throw new TypeError(`Expected a string, got ${typeof filePath}`);
      }
      try {
        const stats = await promisify(fs4[fsStatType])(filePath);
        return stats[statsMethodName]();
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    }
    function isTypeSync(fsStatType, statsMethodName, filePath) {
      if (typeof filePath !== "string") {
        throw new TypeError(`Expected a string, got ${typeof filePath}`);
      }
      try {
        return fs4[fsStatType](filePath)[statsMethodName]();
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    }
    exports.isFile = isType.bind(null, "stat", "isFile");
    exports.isDirectory = isType.bind(null, "stat", "isDirectory");
    exports.isSymlink = isType.bind(null, "lstat", "isSymbolicLink");
    exports.isFileSync = isTypeSync.bind(null, "statSync", "isFile");
    exports.isDirectorySync = isTypeSync.bind(null, "statSync", "isDirectory");
    exports.isSymlinkSync = isTypeSync.bind(null, "lstatSync", "isSymbolicLink");
  }
});

// ../helpers/node_modules/dir-glob/index.js
var require_dir_glob = __commonJS({
  "../helpers/node_modules/dir-glob/index.js"(exports, module2) {
    "use strict";
    var path5 = require("path");
    var pathType = require_path_type();
    var getExtensions = (extensions) => extensions.length > 1 ? `{${extensions.join(",")}}` : extensions[0];
    var getPath = (filepath, cwd) => {
      const pth = filepath[0] === "!" ? filepath.slice(1) : filepath;
      return path5.isAbsolute(pth) ? pth : path5.join(cwd, pth);
    };
    var addExtensions = (file, extensions) => {
      if (path5.extname(file)) {
        return `**/${file}`;
      }
      return `**/${file}.${getExtensions(extensions)}`;
    };
    var getGlob = (directory, options) => {
      if (options.files && !Array.isArray(options.files)) {
        throw new TypeError(`Expected \`files\` to be of type \`Array\` but received type \`${typeof options.files}\``);
      }
      if (options.extensions && !Array.isArray(options.extensions)) {
        throw new TypeError(`Expected \`extensions\` to be of type \`Array\` but received type \`${typeof options.extensions}\``);
      }
      if (options.files && options.extensions) {
        return options.files.map((x) => path5.posix.join(directory, addExtensions(x, options.extensions)));
      }
      if (options.files) {
        return options.files.map((x) => path5.posix.join(directory, `**/${x}`));
      }
      if (options.extensions) {
        return [path5.posix.join(directory, `**/*.${getExtensions(options.extensions)}`)];
      }
      return [path5.posix.join(directory, "**")];
    };
    module2.exports = async (input, options) => {
      options = {
        cwd: process.cwd(),
        ...options
      };
      if (typeof options.cwd !== "string") {
        throw new TypeError(`Expected \`cwd\` to be of type \`string\` but received type \`${typeof options.cwd}\``);
      }
      const globs = await Promise.all([].concat(input).map(async (x) => {
        const isDirectory = await pathType.isDirectory(getPath(x, options.cwd));
        return isDirectory ? getGlob(x, options) : x;
      }));
      return [].concat.apply([], globs);
    };
    module2.exports.sync = (input, options) => {
      options = {
        cwd: process.cwd(),
        ...options
      };
      if (typeof options.cwd !== "string") {
        throw new TypeError(`Expected \`cwd\` to be of type \`string\` but received type \`${typeof options.cwd}\``);
      }
      const globs = [].concat(input).map((x) => pathType.isDirectorySync(getPath(x, options.cwd)) ? getGlob(x, options) : x);
      return [].concat.apply([], globs);
    };
  }
});

// ../helpers/node_modules/ignore/index.js
var require_ignore = __commonJS({
  "../helpers/node_modules/ignore/index.js"(exports, module2) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_TEST_BLANK_LINE = /^\s+$/;
    var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/;
    var SLASH = "/";
    var TMP_KEY_IGNORE = "node-ignore";
    if (typeof Symbol !== "undefined") {
      TMP_KEY_IGNORE = Symbol.for("node-ignore");
    }
    var KEY_IGNORE = TMP_KEY_IGNORE;
    var define2 = (object, key, value) => Object.defineProperty(object, key, { value });
    var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
    var RETURN_FALSE = () => false;
    var sanitizeRange = (range) => range.replace(
      REGEX_REGEXP_RANGE,
      (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
    );
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var REPLACERS = [
      // > Trailing spaces are ignored unless they are quoted with backslash ("\")
      [
        // (a\ ) -> (a )
        // (a  ) -> (a)
        // (a \ ) -> (a  )
        /\\?\s+$/,
        (match) => match.indexOf("\\") === 0 ? SPACE : EMPTY
      ],
      // replace (\ ) with ' '
      [
        /\\\s/g,
        () => SPACE
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match) => `\\${match}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^"
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/"
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*\\\*\\\*\\\//,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        /^(?=[^^])/,
        function startingReplacer() {
          return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
      ],
      // normal intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule,
        //    coz trailing single wildcard will be handed by [trailing wildcard]
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1, p2) => {
          const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
          return p1 + unescaped;
        }
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE
      ],
      [
        // > The range notation, e.g. [a-zA-Z],
        // > can be used to match one of the characters in a range.
        // `\` is escaped by step 3
        /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
        (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        /(?:[^*])$/,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
      ],
      // trailing wildcard
      [
        /(\^|\\\/)?\\\*$/,
        (_, p1) => {
          const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
          return `${prefix}(?=$|\\/$)`;
        }
      ]
    ];
    var regexCache = /* @__PURE__ */ Object.create(null);
    var makeRegex = (pattern, ignoreCase) => {
      let source = regexCache[pattern];
      if (!source) {
        source = REPLACERS.reduce(
          (prev, current) => prev.replace(current[0], current[1].bind(pattern)),
          pattern
        );
        regexCache[pattern] = source;
      }
      return ignoreCase ? new RegExp(source, "i") : new RegExp(source);
    };
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF);
    var IgnoreRule = class {
      constructor(origin, pattern, negative, regex) {
        this.origin = origin;
        this.pattern = pattern;
        this.negative = negative;
        this.regex = regex;
      }
    };
    var createRule = (pattern, ignoreCase) => {
      const origin = pattern;
      let negative = false;
      if (pattern.indexOf("!") === 0) {
        negative = true;
        pattern = pattern.substr(1);
      }
      pattern = pattern.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regex = makeRegex(pattern, ignoreCase);
      return new IgnoreRule(
        origin,
        pattern,
        negative,
        regex
      );
    };
    var throwError = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path5, originalPath, doThrow) => {
      if (!isString(path5)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path5) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path5)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path5) => REGEX_TEST_INVALID_PATH.test(path5);
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define2(this, KEY_IGNORE, true);
        this._rules = [];
        this._ignoreCase = ignoreCase;
        this._allowRelativePaths = allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      _addPattern(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules);
          this._added = true;
          return;
        }
        if (checkPattern(pattern)) {
          const rule = createRule(pattern, this._ignoreCase);
          this._added = true;
          this._rules.push(rule);
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._addPattern, this);
        if (this._added) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      //          |           ignored : unignored
      // negative |   0:0   |   0:1   |   1:0   |   1:1
      // -------- | ------- | ------- | ------- | --------
      //     0    |  TEST   |  TEST   |  SKIP   |    X
      //     1    |  TESTIF |  SKIP   |  TEST   |    X
      // - SKIP: always skip
      // - TEST: always test
      // - TESTIF: only test if checkUnignored
      // - X: that never happen
      // @param {boolean} whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // @returns {TestResult} true if a file is ignored
      _testOne(path5, checkUnignored) {
        let ignored = false;
        let unignored = false;
        this._rules.forEach((rule) => {
          const { negative } = rule;
          if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
            return;
          }
          const matched = rule.regex.test(path5);
          if (matched) {
            ignored = !negative;
            unignored = negative;
          }
        });
        return {
          ignored,
          unignored
        };
      }
      // @returns {TestResult}
      _test(originalPath, cache, checkUnignored, slices) {
        const path5 = originalPath && checkPath.convert(originalPath);
        checkPath(
          path5,
          originalPath,
          this._allowRelativePaths ? RETURN_FALSE : throwError
        );
        return this._t(path5, cache, checkUnignored, slices);
      }
      _t(path5, cache, checkUnignored, slices) {
        if (path5 in cache) {
          return cache[path5];
        }
        if (!slices) {
          slices = path5.split(SLASH);
        }
        slices.pop();
        if (!slices.length) {
          return cache[path5] = this._testOne(path5, checkUnignored);
        }
        const parent = this._t(
          slices.join(SLASH) + SLASH,
          cache,
          checkUnignored,
          slices
        );
        return cache[path5] = parent.ignored ? parent : this._testOne(path5, checkUnignored);
      }
      ignores(path5) {
        return this._test(path5, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path5) => !this.ignores(path5);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path5) {
        return this._test(path5, this._testCache, true);
      }
    };
    var factory = (options) => new Ignore(options);
    var isPathValid = (path5) => checkPath(path5 && checkPath.convert(path5), path5, RETURN_FALSE);
    factory.isPathValid = isPathValid;
    factory.default = factory;
    module2.exports = factory;
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
    ) {
      const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGIX_IS_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path5) => REGIX_IS_WINDOWS_PATH_ABSOLUTE.test(path5) || isNotRelative(path5);
    }
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
  statusCmd: () => statusCmd,
  translateCmd: () => translateCmd
});
module.exports = __toCommonJS(src_exports);

// src/monsterManager.js
var import_words_count = __toESM(require_dist(), 1);

// src/tmManager.js
var path2 = __toESM(require("path"), 1);
var import_fs2 = require("fs");

// ../helpers/node_modules/globby/index.js
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_merge2 = __toESM(require_merge2(), 1);
var import_fast_glob2 = __toESM(require_out4(), 1);
var import_dir_glob = __toESM(require_dir_glob(), 1);

// ../helpers/node_modules/globby/ignore.js
var import_node_process = __toESM(require("node:process"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_fast_glob = __toESM(require_out4(), 1);
var import_ignore = __toESM(require_ignore(), 1);

// ../helpers/node_modules/slash/index.js
function slash(path5) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path5);
  const hasNonAscii = /[^\u0000-\u0080]+/.test(path5);
  if (isExtendedLengthPath || hasNonAscii) {
    return path5;
  }
  return path5.replace(/\\/g, "/");
}

// ../helpers/node_modules/globby/utilities.js
var import_node_url = require("node:url");
var import_node_stream = require("node:stream");
var toPath = (urlOrPath) => urlOrPath instanceof URL ? (0, import_node_url.fileURLToPath)(urlOrPath) : urlOrPath;
var FilterStream = class extends import_node_stream.Transform {
  constructor(filter) {
    super({
      objectMode: true,
      transform(data, encoding, callback) {
        callback(void 0, filter(data) ? data : void 0);
      }
    });
  }
};
var isNegativePattern = (pattern) => pattern[0] === "!";

// ../helpers/node_modules/globby/ignore.js
var ignoreFilesGlobOptions = {
  ignore: [
    "**/node_modules",
    "**/flow-typed",
    "**/coverage",
    "**/.git"
  ],
  absolute: true,
  dot: true
};
var GITIGNORE_FILES_PATTERN = "**/.gitignore";
var applyBaseToPattern = (pattern, base) => isNegativePattern(pattern) ? "!" + import_node_path.default.posix.join(base, pattern.slice(1)) : import_node_path.default.posix.join(base, pattern);
var parseIgnoreFile = (file, cwd) => {
  const base = slash(import_node_path.default.relative(cwd, import_node_path.default.dirname(file.filePath)));
  return file.content.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((pattern) => applyBaseToPattern(pattern, base));
};
var toRelativePath = (fileOrDirectory, cwd) => {
  cwd = slash(cwd);
  if (import_node_path.default.isAbsolute(fileOrDirectory)) {
    if (slash(fileOrDirectory).startsWith(cwd)) {
      return import_node_path.default.relative(cwd, fileOrDirectory);
    }
    throw new Error(`Path ${fileOrDirectory} is not in cwd ${cwd}`);
  }
  return fileOrDirectory;
};
var getIsIgnoredPredicate = (files, cwd) => {
  const patterns = files.flatMap((file) => parseIgnoreFile(file, cwd));
  const ignores = (0, import_ignore.default)().add(patterns);
  return (fileOrDirectory) => {
    fileOrDirectory = toPath(fileOrDirectory);
    fileOrDirectory = toRelativePath(fileOrDirectory, cwd);
    return fileOrDirectory ? ignores.ignores(slash(fileOrDirectory)) : false;
  };
};
var normalizeOptions = (options = {}) => ({
  cwd: toPath(options.cwd) || import_node_process.default.cwd(),
  suppressErrors: Boolean(options.suppressErrors)
});
var isIgnoredByIgnoreFiles = async (patterns, options) => {
  const { cwd, suppressErrors } = normalizeOptions(options);
  const paths = await (0, import_fast_glob.default)(patterns, { cwd, suppressErrors, ...ignoreFilesGlobOptions });
  const files = await Promise.all(
    paths.map(async (filePath) => ({
      filePath,
      content: await import_node_fs.default.promises.readFile(filePath, "utf8")
    }))
  );
  return getIsIgnoredPredicate(files, cwd);
};
var isIgnoredByIgnoreFilesSync = (patterns, options) => {
  const { cwd, suppressErrors } = normalizeOptions(options);
  const paths = import_fast_glob.default.sync(patterns, { cwd, suppressErrors, ...ignoreFilesGlobOptions });
  const files = paths.map((filePath) => ({
    filePath,
    content: import_node_fs.default.readFileSync(filePath, "utf8")
  }));
  return getIsIgnoredPredicate(files, cwd);
};

// ../helpers/node_modules/globby/index.js
var assertPatternsInput = (patterns) => {
  if (patterns.some((pattern) => typeof pattern !== "string")) {
    throw new TypeError("Patterns must be a string or an array of strings");
  }
};
var toPatternsArray = (patterns) => {
  patterns = [...new Set([patterns].flat())];
  assertPatternsInput(patterns);
  return patterns;
};
var checkCwdOption = (options) => {
  if (!options.cwd) {
    return;
  }
  let stat;
  try {
    stat = import_node_fs2.default.statSync(options.cwd);
  } catch {
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error("The `cwd` option must be a path to a directory");
  }
};
var normalizeOptions2 = (options = {}) => {
  options = {
    ignore: [],
    expandDirectories: true,
    ...options,
    cwd: toPath(options.cwd)
  };
  checkCwdOption(options);
  return options;
};
var normalizeArguments = (fn) => async (patterns, options) => fn(toPatternsArray(patterns), normalizeOptions2(options));
var normalizeArgumentsSync = (fn) => (patterns, options) => fn(toPatternsArray(patterns), normalizeOptions2(options));
var getIgnoreFilesPatterns = (options) => {
  const { ignoreFiles, gitignore } = options;
  const patterns = ignoreFiles ? toPatternsArray(ignoreFiles) : [];
  if (gitignore) {
    patterns.push(GITIGNORE_FILES_PATTERN);
  }
  return patterns;
};
var getFilter = async (options) => {
  const ignoreFilesPatterns = getIgnoreFilesPatterns(options);
  return createFilterFunction(
    ignoreFilesPatterns.length > 0 && await isIgnoredByIgnoreFiles(ignoreFilesPatterns, options)
  );
};
var getFilterSync = (options) => {
  const ignoreFilesPatterns = getIgnoreFilesPatterns(options);
  return createFilterFunction(
    ignoreFilesPatterns.length > 0 && isIgnoredByIgnoreFilesSync(ignoreFilesPatterns, options)
  );
};
var createFilterFunction = (isIgnored) => {
  const seen = /* @__PURE__ */ new Set();
  return (fastGlobResult) => {
    const path5 = fastGlobResult.path || fastGlobResult;
    const pathKey = import_node_path2.default.normalize(path5);
    const seenOrIgnored = seen.has(pathKey) || isIgnored && isIgnored(path5);
    seen.add(pathKey);
    return !seenOrIgnored;
  };
};
var unionFastGlobResults = (results, filter) => results.flat().filter((fastGlobResult) => filter(fastGlobResult));
var unionFastGlobStreams = (streams, filter) => (0, import_merge2.default)(streams).pipe(new FilterStream((fastGlobResult) => filter(fastGlobResult)));
var convertNegativePatterns = (patterns, options) => {
  const tasks = [];
  while (patterns.length > 0) {
    const index = patterns.findIndex((pattern) => isNegativePattern(pattern));
    if (index === -1) {
      tasks.push({ patterns, options });
      break;
    }
    const ignorePattern = patterns[index].slice(1);
    for (const task of tasks) {
      task.options.ignore.push(ignorePattern);
    }
    if (index !== 0) {
      tasks.push({
        patterns: patterns.slice(0, index),
        options: {
          ...options,
          ignore: [
            ...options.ignore,
            ignorePattern
          ]
        }
      });
    }
    patterns = patterns.slice(index + 1);
  }
  return tasks;
};
var getDirGlobOptions = (options, cwd) => ({
  ...cwd ? { cwd } : {},
  ...Array.isArray(options) ? { files: options } : options
});
var generateTasks = async (patterns, options) => {
  const globTasks = convertNegativePatterns(patterns, options);
  const { cwd, expandDirectories } = options;
  if (!expandDirectories) {
    return globTasks;
  }
  const patternExpandOptions = getDirGlobOptions(expandDirectories, cwd);
  const ignoreExpandOptions = cwd ? { cwd } : void 0;
  return Promise.all(
    globTasks.map(async (task) => {
      let { patterns: patterns2, options: options2 } = task;
      [
        patterns2,
        options2.ignore
      ] = await Promise.all([
        (0, import_dir_glob.default)(patterns2, patternExpandOptions),
        (0, import_dir_glob.default)(options2.ignore, ignoreExpandOptions)
      ]);
      return { patterns: patterns2, options: options2 };
    })
  );
};
var generateTasksSync = (patterns, options) => {
  const globTasks = convertNegativePatterns(patterns, options);
  const { cwd, expandDirectories } = options;
  if (!expandDirectories) {
    return globTasks;
  }
  const patternExpandOptions = getDirGlobOptions(expandDirectories, cwd);
  const ignoreExpandOptions = cwd ? { cwd } : void 0;
  return globTasks.map((task) => {
    let { patterns: patterns2, options: options2 } = task;
    patterns2 = import_dir_glob.default.sync(patterns2, patternExpandOptions);
    options2.ignore = import_dir_glob.default.sync(options2.ignore, ignoreExpandOptions);
    return { patterns: patterns2, options: options2 };
  });
};
var globby = normalizeArguments(async (patterns, options) => {
  const [
    tasks,
    filter
  ] = await Promise.all([
    generateTasks(patterns, options),
    getFilter(options)
  ]);
  const results = await Promise.all(tasks.map((task) => (0, import_fast_glob2.default)(task.patterns, task.options)));
  return unionFastGlobResults(results, filter);
});
var globbySync = normalizeArgumentsSync((patterns, options) => {
  const tasks = generateTasksSync(patterns, options);
  const filter = getFilterSync(options);
  const results = tasks.map((task) => import_fast_glob2.default.sync(task.patterns, task.options));
  return unionFastGlobResults(results, filter);
});
var globbyStream = normalizeArgumentsSync((patterns, options) => {
  const tasks = generateTasksSync(patterns, options);
  const filter = getFilterSync(options);
  const streams = tasks.map((task) => import_fast_glob2.default.stream(task.patterns, task.options));
  return unionFastGlobStreams(streams, filter);
});
var isDynamicPattern = normalizeArgumentsSync(
  (patterns, options) => patterns.some((pattern) => import_fast_glob2.default.isDynamicPattern(pattern, options))
);
var generateGlobTasks = normalizeArguments(generateTasks);
var generateGlobTasksSync = normalizeArgumentsSync(generateTasksSync);

// ../helpers/src/normalizers.js
var normalizers_exports = {};
__export(normalizers_exports, {
  bracePHDecoder: () => bracePHDecoder,
  defaultCodeEncoder: () => defaultCodeEncoder,
  doublePercentDecoder: () => doublePercentDecoder,
  doublePercentEncoder: () => doublePercentEncoder,
  gatedEncoder: () => gatedEncoder,
  keywordTranslatorMaker: () => keywordTranslatorMaker,
  namedDecoder: () => namedDecoder
});

// ../helpers/src/regex.js
var decoderMaker = function regexDecoderMaker(flag, regex, partDecoder) {
  const fn = function decoder(parts) {
    const decodedParts = parts.map((p) => {
      if (p.t === "s" || typeof p === "string") {
        const textValue = typeof p === "string" ? p : p.v;
        const expandedPart = [];
        let pos = 0;
        for (const match of textValue.matchAll(regex)) {
          if (match.index > pos) {
            expandedPart.push({
              t: "s",
              v: match.input.substring(pos, match.index)
            });
          }
          const decodedMatch = partDecoder(match.groups);
          if (typeof decodedMatch === "string") {
            expandedPart.push({
              t: "s",
              v: decodedMatch,
              flag
            });
          } else {
            expandedPart.push(decodedMatch);
          }
          pos = match.index + match[0].length;
        }
        if (pos < textValue.length) {
          expandedPart.push({
            t: "s",
            v: textValue.substring(pos, textValue.length)
          });
        }
        return expandedPart;
      } else {
        return p;
      }
    });
    return decodedParts.flat(1);
  };
  Object.defineProperty(fn, "name", { value: flag });
  return fn;
};
var encoderMaker = function regexEncoderMaker(name, regex, matchMap) {
  const fn = function encoder(str, flags = {}) {
    return str.replaceAll(regex, (match, ...capture) => {
      const matchToReplace = capture.reduce((p, c) => p ?? c);
      return typeof matchMap === "function" ? matchMap(match, flags, ...capture) : match.replace(matchToReplace, matchMap[matchToReplace]);
    });
  };
  Object.defineProperty(fn, "name", { value: name });
  return fn;
};

// ../helpers/src/normalizers.js
function namedDecoder(name, decoder) {
  const fn = function namedDecoder2(parts) {
    return decoder(parts).map((p) => p.flag === decoder.name ? { ...p, flag: name } : p);
  };
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}
var doublePercentDecoder = decoderMaker(
  "doublePercentDecoder",
  /(?<percent>%%)/g,
  () => "%"
);
function gatedEncoder(encoder, ...flagNames) {
  const fn = function gatedEncoder2(str, flags = {}) {
    const run = flagNames.reduce((run2, flag) => run2 || (flag.charAt(0) === "!" ? !flags[flag.substring(1)] : flags[flag]), false);
    return run ? encoder(str, flags) : str;
  };
  Object.defineProperty(fn, "name", { value: `gatedEncoder_${flagNames.join("_")}` });
  return fn;
}
var doublePercentEncoder = encoderMaker("doublePercentEncoder", /(?<pct>%)/g, { "%": "%%" });
var bracePHDecoder = decoderMaker(
  "bracePHDecoder",
  /(?<x>{[^}]+})/g,
  (groups) => ({ t: "x", v: groups.x })
);
function keywordTranslatorMaker(name, keywordToTranslationMap) {
  if (keywordToTranslationMap && Object.keys(keywordToTranslationMap).length > 0) {
    const decoder = decoderMaker(
      name,
      new RegExp(`(?<kw>${Object.keys(keywordToTranslationMap).join("|")})`, "g"),
      (groups) => ({ t: "x", v: `${name}:${groups.kw}`, s: groups.kw })
    );
    const encoder = encoderMaker(
      name,
      new RegExp(`^(?:${name}:(?<kw>.+))$`, "g"),
      (match, flags, kw) => {
        const tx = keywordToTranslationMap[kw];
        return tx && typeof tx === "object" ? tx[flags.targetLang] ?? tx[flags.prj] ?? kw : kw;
      }
    );
    return [decoder, encoder];
  } else {
    throw "You have to specify a keyword map to keywordTranslatorMaker";
  }
}
function defaultCodeEncoder(part) {
  return part.v;
}

// ../helpers/src/utils.js
var utils_exports = {};
__export(utils_exports, {
  consolidateDecodedParts: () => consolidateDecodedParts,
  decodeNormalizedString: () => decodeNormalizedString,
  extractNormalizedPartsFromXmlV1: () => extractNormalizedPartsFromXmlV1,
  extractNormalizedPartsV1: () => extractNormalizedPartsV1,
  extractStructuredNotes: () => extractStructuredNotes,
  fixCaseInsensitiveKey: () => fixCaseInsensitiveKey,
  flattenNormalizedSourceToOrdinal: () => flattenNormalizedSourceToOrdinal,
  flattenNormalizedSourceToXmlV1: () => flattenNormalizedSourceToXmlV1,
  flattenNormalizedSourceV1: () => flattenNormalizedSourceV1,
  generateGuid: () => generateGuid,
  getNormalizedString: () => getNormalizedString,
  getTUMaps: () => getTUMaps,
  integerToLabel: () => integerToLabel,
  normalizedStringsAreEqual: () => normalizedStringsAreEqual,
  phMatcherMaker: () => phMatcherMaker,
  sourceAndTargetAreCompatible: () => sourceAndTargetAreCompatible
});
var import_crypto = require("crypto");
function generateGuid(str) {
  const sidContentHash = (0, import_crypto.createHash)("sha256");
  sidContentHash.update(str, "utf8");
  return sidContentHash.digest().toString("base64").substring(0, 43).replaceAll("+", "-").replaceAll("/", "_");
}
function consolidateDecodedParts(parts, flags, convertToString) {
  const consolidatedParts = [];
  let accumulatedString = "";
  for (const part of parts) {
    if (part.t === "s" || typeof part === "string") {
      accumulatedString += typeof part === "string" ? part : part.v;
      part.flag && (flags[part.flag] = true);
    } else {
      if (accumulatedString.length > 0) {
        consolidatedParts.push(convertToString ? accumulatedString : { t: "s", v: accumulatedString });
        accumulatedString = "";
      }
      consolidatedParts.push(part);
    }
  }
  if (accumulatedString.length > 0) {
    consolidatedParts.push(convertToString ? accumulatedString : { t: "s", v: accumulatedString });
  }
  return consolidatedParts;
}
function decodeNormalizedString(nstr, decoderList, flags = {}) {
  if (decoderList) {
    for (const decoder of decoderList) {
      nstr = consolidateDecodedParts(decoder(nstr), flags);
    }
  }
  return consolidateDecodedParts(nstr, flags, true);
}
function getNormalizedString(str, decoderList, flags = {}) {
  return decoderList ? decodeNormalizedString([{ t: "s", v: str }], decoderList, flags) : [str];
}
function flattenNormalizedSourceToOrdinal(nsrc) {
  return nsrc.map((e) => typeof e === "string" ? e : `{{${e.t}}}`).join("");
}
function flattenNormalizedSourceV1(nsrc) {
  const normalizedStr = [], phMap = {};
  let phIdx = 0;
  for (const part of nsrc) {
    if (typeof part === "string") {
      normalizedStr.push(part);
    } else {
      phIdx++;
      const phPrefix = phIdx < 26 ? String.fromCharCode(96 + phIdx) : `z${phIdx}`;
      const mangledPh = `${phPrefix}_${part.t}_${(part.v?.match(/[0-9A-Za-z_]+/) || [""])[0]}`;
      normalizedStr.push(`{{${mangledPh}}}`);
      phMap[mangledPh] = {
        ...part,
        v1: mangledPh
      };
    }
  }
  return [normalizedStr.join(""), phMap];
}
function extractNormalizedPartsV1(str, phMap) {
  const normalizedParts = [];
  let pos = 0;
  for (const match of str.matchAll(/{{(?<ph>(?<phIdx>[a-y]|z\d+)_(?<t>x|bx|ex)_(?<phName>[0-9A-Za-z_]*))}}/g)) {
    if (match.index > pos) {
      normalizedParts.push(match.input.substring(pos, match.index));
    }
    normalizedParts.push(phMap[match.groups.ph] && {
      ...phMap[match.groups.ph],
      v1: match.groups.ph
      // TODO: why do we need this? shouldn't the phMap already contain v1?
    });
    pos = match.index + match[0].length;
  }
  if (pos < str.length) {
    normalizedParts.push(str.substring(pos, str.length));
  }
  return normalizedParts;
}
function flattenNormalizedSourceToXmlV1(nsrc) {
  const normalizedStr = [], phMap = {};
  let phIdx = 0, nestingLevel = 0, openTagShorthand = [];
  for (const part of nsrc) {
    if (typeof part === "string") {
      normalizedStr.push(part.replaceAll("<", "&lt;"));
    } else {
      phIdx++;
      const phPrefix = phIdx < 26 ? String.fromCharCode(96 + phIdx) : `z${phIdx}`;
      const mangledPh = `${phPrefix}_${part.t}_${(part.v.match(/[0-9A-Za-z_]+/) || [""])[0]}`;
      let phShorthand = `x${phIdx}`;
      if (part.t === "x" || part.t === "ex" && nestingLevel === 0) {
        if (part.s) {
          normalizedStr.push(`<${phShorthand}>${part.s}</${phShorthand}>`);
        } else {
          normalizedStr.push(`<${phShorthand} />`);
        }
      } else if (part.t === "bx") {
        normalizedStr.push(`<${phShorthand}>`);
        openTagShorthand[nestingLevel] = phShorthand;
        nestingLevel++;
        phShorthand = `b${phShorthand}`;
      } else if (part.t === "ex") {
        nestingLevel--;
        phShorthand = openTagShorthand[nestingLevel];
        normalizedStr.push(`</${phShorthand}>`);
        phShorthand = `e${phShorthand}`;
      }
      phMap[phShorthand] = {
        ...part,
        v1: mangledPh
      };
    }
  }
  return [normalizedStr.join(""), phMap];
}
var cleanXMLEntities = (str) => str.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&nbsp;", "\xA0").replaceAll("&amp;", "&");
function extractNormalizedPartsFromXmlV1(str, phMap) {
  const normalizedParts = [];
  let pos = 0;
  for (const match of str.matchAll(/<(?<x>x\d+) \/>|<(?<bx>x\d+)>|<\/(?<ex>x\d+)>/g)) {
    const phSample = phMap[match.groups.ex];
    if (match.index > pos) {
      if (phSample) {
        match.input.charAt(pos) === " " && normalizedParts.push(" ");
      } else {
        normalizedParts.push(cleanXMLEntities(match.input.substring(pos, match.index)));
      }
    }
    !phMap[match.groups.bx] && // if we have a ph sample, skip the open tag
    normalizedParts.push(phSample ?? phMap[match.groups.x] ?? phMap[match.groups.bx && `b${match.groups.bx}`] ?? phMap[match.groups.ex && `e${match.groups.ex}`]);
    match.index > pos && phSample && match.input.charAt(match.index - 1) === " " && normalizedParts.push(" ");
    pos = match.index + match[0].length;
  }
  if (pos < str.length) {
    normalizedParts.push(cleanXMLEntities(str.substring(pos, str.length)));
  }
  return normalizedParts;
}
var minifyV1PH = (v1ph) => v1ph && v1ph.split("_").slice(0, -1).join("_");
function phMatcherMaker(nsrc) {
  const phMap = flattenNormalizedSourceV1(nsrc)[1];
  const v1PhMap = Object.fromEntries(Object.entries(phMap).map(([k, v]) => [minifyV1PH(k), v]));
  const valueMap = Object.fromEntries(Object.values(v1PhMap).map((e) => [e.v, true]));
  return function matchPH(part) {
    return v1PhMap[minifyV1PH(part.v1)] ?? (valueMap[part.v] && part);
  };
}
function sourceAndTargetAreCompatible(nsrc, ntgt) {
  if (Array.isArray(nsrc) && Array.isArray(ntgt)) {
    const phMatcher = phMatcherMaker(nsrc);
    if (!phMatcher) {
      return false;
    }
    for (const part of ntgt) {
      if (typeof part === "object") {
        if (phMatcher(part) === void 0) {
          return false;
        }
      }
    }
    return Object.keys(nsrc.filter((e) => typeof e === "object")).length === Object.keys(ntgt.filter((e) => typeof e === "object")).length;
  }
  return false;
}
function flattenNormalizedSourceToMiniV1(nsrc) {
  return nsrc.map((e) => typeof e === "string" ? e : `{{${e.v1 ? minifyV1PH(e.v1) : e.v}}}`).join("");
}
function normalizedStringsAreEqual(s1, s2) {
  return flattenNormalizedSourceToMiniV1(s1) === flattenNormalizedSourceToMiniV1(s2);
}
function getTUMaps(tus) {
  const contentMap = {};
  const tuMeta = {};
  const phNotes = {};
  for (const tu of tus) {
    const guid = tu.guid;
    const [normalizedStr, phMap] = flattenNormalizedSourceV1(tu.nsrc);
    contentMap[guid] = normalizedStr;
    if (Object.keys(phMap).length > 0) {
      tuMeta[guid] = { phMap, nsrc: tu.nsrc };
      const sourcePhNotes = tu?.notes?.ph ?? {};
      phNotes[guid] = Object.entries(phMap).reduce((p, c, i) => `${p}
  ${String.fromCodePoint(9312 + i)}  ${c[0]} \u2192 ${c[1].v}${c[1].s === void 0 ? "" : ` \u2192 ${c[1].s}`}${sourcePhNotes[c[1].v]?.sample ? ` \u2192 ${sourcePhNotes[c[1].v]?.sample}` : ""}${sourcePhNotes[c[1].v]?.desc ? `   (${sourcePhNotes[c[1].v].desc})` : ""}`, "\n ph:").replaceAll("<", "\u1438").replaceAll(">", "\u1433");
    }
    if (tu.ntgt) {
      const [normalizedStr2, phMap2] = flattenNormalizedSourceV1(tu.ntgt);
      phNotes[guid] += `
 current translation: ${normalizedStr2}`;
    }
  }
  return { contentMap, tuMeta, phNotes };
}
var notesAnnotationRegex = /(?:PH\((?<phName>(?:[^()|]+|[^(|]*\([^()|]*\)[^()|]*))(?:\|(?<phSample>[^)|]+))(?:\|(?<phDesc>[^)|]+))?\)|MAXWIDTH\((?<maxWidth>\d+)\)|SCREENSHOT\((?<screenshot>[^)]+)\)|TAG\((?<tags>[^)]+)\))/g;
function extractStructuredNotes(notes) {
  const sNotes = {};
  const cleanDesc = notes.replaceAll(notesAnnotationRegex, (match, phName, phSample, phDesc, maxWidth, screenshot, tags) => {
    if (maxWidth !== void 0) {
      sNotes.maxWidth = Number(maxWidth);
    } else if (phName !== void 0) {
      phName = phName.trim();
      sNotes.ph = sNotes.ph ?? {};
      sNotes.ph[phName] = {
        sample: phSample.trim()
      };
      phDesc && (sNotes.ph[phName].desc = phDesc.trim());
    } else if (screenshot !== void 0) {
      sNotes.screenshot = screenshot;
    } else if (tags !== void 0) {
      sNotes.tags = tags.split(",").map((s) => s.trim());
    }
    return "";
  });
  sNotes.desc = cleanDesc;
  return sNotes;
}
var base32Chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function integerToLabel(int) {
  const label = [];
  while (int > 0) {
    label.push(base32Chars.charAt(int % 32));
    int = Math.floor(int / 32);
  }
  return label.join("");
}
function fixCaseInsensitiveKey(object, key) {
  const asLowercase = key.toLowerCase();
  return Object.keys(object).find((k) => k.toLowerCase() === asLowercase);
}

// ../helpers/src/xml.js
var namedEntities = {
  "&nbsp;": "\xA0",
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">"
};
var entityDecoder = decoderMaker(
  "xmlEntityDecoder",
  /(?<node>&#x(?<hexEntity>[0-9a-fA-F]+);|(?<namedEntity>&[^#;]+;)|&#(?<numericEntity>\d+);)/g,
  // eslint-disable-next-line no-nested-ternary
  (groups) => groups.namedEntity ? namedEntities[groups.namedEntity] || groups.namedEntity : groups.hexEntity ? String.fromCharCode(parseInt(groups.hexEntity, 16)) : String.fromCharCode(parseInt(groups.numericEntity, 10))
);
var CDataDecoder = decoderMaker(
  "xmlCDataDecoder",
  /(?:<!\[CDATA\[(?<cdata>.*?)\]\]>|(?:(?<firstChar>[^\\])"|^")(?<quoted>.*?)(?<lastChar>[^\\])")/gs,
  (groups) => groups.cdata ?? (groups.firstChar || "") + groups.quoted + (groups.lastChar ?? "")
);
var entityEncoder = encoderMaker(
  "xmlEntityEncoder",
  // eslint-disable-next-line prefer-named-capture-group
  /(&)|(<)|(\u00a0)/g,
  {
    "&": "&amp;",
    "<": "&lt;",
    "\xA0": "&#160;"
  }
);
var tagDecoder = decoderMaker(
  "xmlDecoder",
  /(?<tag>(?<x><[^>]+\/>)|(?<bx><[^/!][^>]*>)|(?<ex><\/[^>]+>))/g,
  // eslint-disable-next-line no-nested-ternary
  (groups) => ({ t: groups.bx ? "bx" : groups.ex ? "ex" : "x", v: groups.tag })
);

// src/tmManager.js
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
    if ((0, import_fs2.existsSync)(tmPathName)) {
      const tmData = JSON.parse((0, import_fs2.readFileSync)(tmPathName, "utf8"));
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
      const flattenSrc = utils_exports.flattenNormalizedSourceToOrdinal(cleanedTU.nsrc);
      this.#lookUpByFlattenSrc[flattenSrc] ??= [];
      !this.#lookUpByFlattenSrc[flattenSrc].includes(cleanedTU) && this.#lookUpByFlattenSrc[flattenSrc].push(cleanedTU);
    } catch (e) {
      l10nmonster.logger.verbose(`Not setting TM entry: ${e}`);
    }
  }
  getAllEntriesBySrc(src) {
    const flattenedSrc = utils_exports.flattenNormalizedSourceToOrdinal(src);
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
      (0, import_fs2.writeFileSync)(this.#tmPathName, JSON.stringify(tmData, null, "	"), "utf8");
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
      tm = new TM(sourceLang, targetLang, path2.join(this.monsterDir, tmFileName), this.configSeal, jobs);
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
  constructor({ id, channel, modified, resourceFormat, formatHandler, sourceLang, targetLangs, prj, ...other }) {
    this.id = id;
    this.channel = channel;
    this.modified = modified;
    this.resourceFormat = resourceFormat;
    this.#formatHandler = formatHandler;
    this.sourceLang = sourceLang;
    this.targetLangs = targetLangs;
    this.prj = prj;
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
var Normalizer = class {
  #decoders;
  #textEncoders;
  #codeEncoders;
  constructor({ decoders, textEncoders, codeEncoders, joiner }) {
    this.#decoders = decoders;
    this.#textEncoders = textEncoders;
    this.#codeEncoders = codeEncoders ?? [normalizers_exports.defaultCodeEncoder];
    this.join = joiner ?? ((parts) => parts.join(""));
  }
  decode(str, flags = {}) {
    return utils_exports.getNormalizedString(str, this.#decoders, flags);
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
var FormatHandler = class {
  #id;
  #resourceFilter;
  #normalizers;
  #defaultMessageFormat;
  #segmentDecorators;
  #formatHandlers;
  constructor({ id, resourceFilter, normalizers, defaultMessageFormat, segmentDecorators, formatHandlers }) {
    if (!resourceFilter) {
      throw `Missing resource filter for format ${this.#id}`;
    }
    this.#id = id;
    this.#resourceFilter = resourceFilter;
    this.#normalizers = normalizers;
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
    base.gstr = utils_exports.flattenNormalizedSourceToOrdinal(base.nstr);
    base.guid = utils_exports.generateGuid(`${rid}|${base.sid}|${base.gstr}`);
    return base;
  }
  #translateWithTMEntry(nsrc, entry) {
    if (entry && !entry.inflight) {
      if (utils_exports.sourceAndTargetAreCompatible(nsrc, entry.ntgt)) {
        const phMatcher = utils_exports.phMatcherMaker(nsrc);
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
        normalizedSeg.notes = utils_exports.extractStructuredNotes(notes);
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
          const subresGuids2 = new Set(guids);
          const subresSegments = resHandle.segments.filter((seg) => subresGuids2.has(seg.guid));
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
      const subresGuids = new Set(guidsToSkip.flat(1));
      const translations = {};
      for (const seg of resHandle.segments) {
        if (!subresGuids.has(seg.guid)) {
          const entry = tm.getEntryByGuid(seg.guid);
          try {
            const nstr = this.#translateWithTMEntry(seg.nstr, entry);
            if (nstr !== void 0) {
              const segmentFlags = Object.fromEntries((seg.flags ?? []).map((f) => [f, true]));
              const str = this.#encodeTranslatedSegment(nstr, seg.mf, { ...flags, ...segmentFlags });
              translations[seg.guid] = { nstr, str };
            }
          } catch (e) {
            l10nmonster.logger.verbose(`Problem translating guid ${seg.guid} to ${tm.targetLang}: ${e.stack ?? e}`);
          }
        }
      }
      return this.#resourceFilter.generateResource({ ...resHandle, translations, subresources });
    }
    const sourceLookup = Object.fromEntries(resHandle.segments.map((seg) => [seg.sid, seg]));
    const translator = async (sid, str) => {
      const normalizedSource = sourceLookup[sid];
      if (normalizedSource) {
        const segToTranslate = this.#populateGuid(resHandle.id, str, normalizedSource.mf, { sid }, flags);
        if (normalizedSource.guid !== segToTranslate.guid) {
          l10nmonster.logger.verbose(`Normalized source outdated: ${normalizedSource.gstr}
${segToTranslate.gstr}`);
          return void 0;
        }
        const entry = tm.getEntryByGuid(segToTranslate.guid);
        if (!entry) {
          l10nmonster.logger.verbose(`${tm.targetLang} translation not found for ${resHandle.id}, ${sid}, ${str}`);
          return void 0;
        }
        try {
          const normalizedTranslation = this.#translateWithTMEntry(normalizedSource.nstr, entry);
          return this.#encodeTranslatedSegment(normalizedTranslation, normalizedSource.mf, flags);
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
      const normalizers = {};
      for (const [normalizer, normalizerCfg] of Object.entries(formatCfg.normalizers)) {
        validate(`normalizer ${normalizer}`, normalizerCfg).arrayOfFunctions("decoders", "textEncoders", "codeEncoders");
        normalizers[normalizer] = new Normalizer({
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
        normalizers,
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
        const normalizers = {};
        normalizers[type] = {
          decoders: config.decoders,
          textEncoders: config.textEncoders,
          codeEncoders: config.codeEncoders,
          joiner: config.joiner
        };
        formats[type] = {
          resourceFilter: config.resourceFilter,
          normalizers,
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
      const targetLangSet = utils_exports.fixCaseInsensitiveKey(this.#targetLangSets, limitToLang);
      if (targetLangSet) {
        const langs = this.#targetLangSets[targetLangSet];
        l10nmonster.logger.info(`Using language alias ${targetLangSet}: ${langs.join(", ")}`);
        return langs;
      }
      const langsToLimit = limitToLang.split(",");
      const invalidLangs = langsToLimit.filter((limitedLang) => !this.#targetLangs.has(limitedLang));
      if (invalidLangs.length > 0) {
        throw `Invalid languages: ${invalidLangs.join(",")}`;
      }
      return langsToLimit;
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
          const isCompatible = utils_exports.sourceAndTargetAreCompatible(tu?.nsrc, tmEntry?.ntgt);
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
      jobManifest.translationProvider = utils_exports.fixCaseInsensitiveKey(this.translationProviders, jobManifest.translationProvider);
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
var path3 = __toESM(require("path"), 1);
var import_fs3 = require("fs");
var fs3 = __toESM(require("fs"), 1);
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
      const fullPath = path3.join(this.opsMgr.opsDir, `${this.taskName}-plan.json`);
      return fs3.writeFileSync(fullPath, JSON.stringify(state, null, "	"), "utf8");
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
      const fullPath = path3.join(this.opsMgr.opsDir, `${this.taskName}-out${opId}.json`);
      const outJSON = fs3.readFileSync(fullPath, "utf8");
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
                const fullPath = path3.join(this.opsMgr.opsDir, `${this.taskName}-out${op.opId}.json`);
                fs3.writeFileSync(fullPath, responseJSON, "utf8");
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
      const fullPath = path3.join(this.opsMgr.opsDir, filename);
      const state = JSON.parse(fs3.readFileSync(fullPath));
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
      if (!(0, import_fs3.existsSync)(opsDir)) {
        (0, import_fs3.mkdirSync)(opsDir, { recursive: true });
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
async function analyzeCmd(mm, analyzer, params, limitToLang, tuFilter) {
  const Analyzer = mm.analyzers[utils_exports.fixCaseInsensitiveKey(mm.analyzers, analyzer)];
  if (!Analyzer) {
    throw `couldn't find a ${analyzer} analyzer`;
  }
  let tuFilterFunction;
  if (tuFilter) {
    tuFilter = utils_exports.fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
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
async function pushCmd(mm, { limitToLang, tuFilter, driver, refresh, translationProviderName, leverage, dryRun, instructions }) {
  let tuFilterFunction;
  if (tuFilter) {
    tuFilter = utils_exports.fixCaseInsensitiveKey(mm.tuFilters, tuFilter);
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

// src/commands/translate.js
async function translateCmd(mm, { limitToLang, dryRun }) {
  const status = { generatedResources: {}, deleteResources: {} };
  const targetLangs = mm.getTargetLangs(limitToLang);
  const allResources = await mm.rm.getAllResources({ keepRaw: true });
  for await (const resHandle of allResources) {
    for (const targetLang of targetLangs) {
      if (resHandle.targetLangs.includes(targetLang) && (l10nmonster.prj === void 0 || l10nmonster.prj.includes(resHandle.prj))) {
        const tm = await mm.tmm.getTM(resHandle.sourceLang, targetLang);
        const translatedRes = await resHandle.generateTranslatedRawResource(tm);
        if (!dryRun) {
          status.generatedResources[targetLang] ??= [];
          status.deleteResources[targetLang] ??= [];
          const translatedResourceId = await mm.rm.getChannel(resHandle.channel).commitTranslatedResource(targetLang, resHandle.id, translatedRes);
          (translatedRes === null ? status.deleteResources : status.generatedResources)[targetLang].push(translatedResourceId);
        }
      }
    }
  }
  return status;
}

// src/monsterFactory.js
var path4 = __toESM(require("path"), 1);
var import_fs4 = require("fs");

// src/entities/tu.js
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
    const sourcePhMap = utils_exports.flattenNormalizedSourceV1(cleanTU.nsrc)[1];
    Object.values(sourcePhMap).forEach((part) => (lookup[part.v] ??= []).push(part.v1));
    for (const part of cleanTU.ntgt) {
      if (typeof part === "object") {
        part.v1 = lookup[part.v].shift();
      }
    }
  }
  return cleanTU;
}
var TU = class {
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
    return new TU(cleanupTU(obj), true, false);
  }
  // returns a TU with both source and target string
  static asTarget(obj) {
    return new TU(cleanupTU(obj), false, true);
  }
  // returns a TU with both source and target string
  static asPair(obj) {
    return new TU(cleanupTU(obj), true, true);
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
    return TU.asSource(tu);
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
  l10nmonster.baseDir = path4.dirname(configPath);
  l10nmonster.regression = options.regression;
  l10nmonster.logger.verbose(`Requiring config: ${configPath}`);
  l10nmonster.prj = options.prj && options.prj.split(",");
  l10nmonster.arg = options.arg;
  l10nmonster.TU = TU;
  const Config = require(configPath);
  if (typeof Config !== "function") {
    throw "Invalid Config. Need to export a class constructor as a CJS module.exports";
  }
  l10nmonster.opsMgr = Config.opsDir ? new OpsMgr(path4.join(l10nmonster.baseDir, Config.opsDir)) : new OpsMgr();
  try {
    const monsterConfig = new Config();
    const monsterDir = path4.join(l10nmonster.baseDir, monsterConfig.monsterDir ?? ".l10nmonster");
    l10nmonster.logger.verbose(`Monster cache dir: ${monsterDir}`);
    (0, import_fs4.mkdirSync)(monsterDir, { recursive: true });
    const configSeal = (0, import_fs4.statSync)(configPath).mtime.toISOString();
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
  statusCmd,
  translateCmd
});
/*! Bundled license information:

is-extglob/index.js:
  (*!
   * is-extglob <https://github.com/jonschlinkert/is-extglob>
   *
   * Copyright (c) 2014-2016, Jon Schlinkert.
   * Licensed under the MIT License.
   *)

is-glob/index.js:
  (*!
   * is-glob <https://github.com/jonschlinkert/is-glob>
   *
   * Copyright (c) 2014-2017, Jon Schlinkert.
   * Released under the MIT License.
   *)

is-number/index.js:
  (*!
   * is-number <https://github.com/jonschlinkert/is-number>
   *
   * Copyright (c) 2014-present, Jon Schlinkert.
   * Released under the MIT License.
   *)

to-regex-range/index.js:
  (*!
   * to-regex-range <https://github.com/micromatch/to-regex-range>
   *
   * Copyright (c) 2015-present, Jon Schlinkert.
   * Released under the MIT License.
   *)

fill-range/index.js:
  (*!
   * fill-range <https://github.com/jonschlinkert/fill-range>
   *
   * Copyright (c) 2014-present, Jon Schlinkert.
   * Licensed under the MIT License.
   *)

queue-microtask/index.js:
  (*! queue-microtask. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)

run-parallel/index.js:
  (*! run-parallel. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)
*/
//# sourceMappingURL=index.cjs.map
