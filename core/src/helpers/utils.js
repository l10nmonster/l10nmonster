import { createHash } from 'crypto';
import { logVerbose } from '../l10nContext.js';
import { TU } from '../entities/tu.js';

/**
 * @typedef {import('../../index.js').NormalizedString} NormalizedString
 * @typedef {import('../../index.js').Part} Part
 * @typedef {import('../../index.js').PlaceholderPart} PlaceholderPart
 * @typedef {import('../../index.js').JobProps} JobProps
 * @typedef {import('../../index.js').Job} Job
 * @typedef {import('../../index.js').StructuredNotes} StructuredNotes
 */

/**
 * Placeholder map returned by flatten functions.
 * Maps mangled placeholder names to their full placeholder objects with v1 property.
 * @typedef {Object<string, PlaceholderPart>} PlaceholderMap
 */

/**
 * TU maps for translation provider communication.
 * @typedef {Object} TUMaps
 * @property {Object<string, string>} contentMap - Map of GUID to flattened source string.
 * @property {Object<string, Object>} tuMeta - Map of GUID to placeholder metadata.
 * @property {Object<string, string>} phNotes - Map of GUID to formatted placeholder notes.
 */

/**
 * Generates a URL-safe base64 GUID from a string using SHA-256.
 * @param {string} str - Input string to hash.
 * @returns {string} A 43-character URL-safe base64 hash.
 */
export function generateGuid(str) {
    const sidContentHash = createHash('sha256');
    sidContentHash.update(str, 'utf8');
    return sidContentHash.digest().toString('base64').substring(0, 43).replaceAll('+', '-').replaceAll('/', '_');
}

/**
 * Consolidates decoded parts, merging adjacent string parts.
 * @param {Part[]} parts - Array of decoded parts.
 * @param {import('../interfaces.js').EncodeFlags} flags - Flags object to collect decoder flags.
 * @param {boolean} [convertToString] - Whether to convert string parts to plain strings.
 * @returns {Part[]} Consolidated array of parts.
 */
export function consolidateDecodedParts(parts, flags, convertToString) {
    const consolidatedParts = [];
    let accumulatedString = '';
    for (const part of parts) {
        if (typeof part === 'string' || part.t === 's') {
            accumulatedString += typeof part === 'string' ? part : part.v;
            (typeof part !== 'string' && part.flag) && (flags[part.flag] = true);
        } else {
            if (accumulatedString.length > 0) {
                consolidatedParts.push(convertToString ? accumulatedString : { t: 's', v: accumulatedString });
                accumulatedString = '';
            }
            consolidatedParts.push(part);
        }
    }
    if (accumulatedString.length > 0) {
        consolidatedParts.push(convertToString ? accumulatedString : { t: 's', v: accumulatedString });
    }
    return consolidatedParts;
}

/**
 * Decodes a normalized string through a pipeline of decoders.
 * @param {Part[]} nstr - Initial normalized string parts.
 * @param {import('../../index.js').DecoderFunction[]} decoderList - Array of decoder functions.
 * @param {import('../interfaces.js').EncodeFlags} [flags] - Flags object for decoder state.
 * @returns {NormalizedString} Fully decoded normalized string.
 */
export function decodeNormalizedString(nstr, decoderList, flags = {}) {
    if (decoderList) {
        for (const decoder of decoderList) {
            nstr = consolidateDecodedParts(decoder(nstr), flags);
        }
    }
    return consolidateDecodedParts(nstr, flags, true);
}

/**
 * Converts a raw string to a normalized string using decoders.
 * @param {string} str - Raw input string.
 * @param {import('../../index.js').DecoderFunction[]} decoderList - Array of decoder functions.
 * @param {import('../interfaces.js').EncodeFlags} [flags] - Flags object for decoder state.
 * @returns {NormalizedString} Normalized string (array of parts).
 */
export function getNormalizedString(str, decoderList, flags = {}) {
    return decoderList ? decodeNormalizedString([ { t: 's', v: str } ], decoderList, flags) : [ str ];
}

/**
 * Converts a normalized source to a flat string with placeholder types only.
 * @param {NormalizedString} nsrc - Normalized source string.
 * @returns {string} Flattened string with {{type}} placeholders.
 */
export function flattenNormalizedSourceToOrdinal(nsrc) {
    return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

/**
 * Flattens a normalized source to a string using the V1 placeholder algorithm.
 *
 * V1 encodes placeholders as `{{mangledPh}}` where mangledPh has 3 parts:
 * 1. An index ("a" to "y", then "z1", "z2", ...)
 * 2. The placeholder type (bx=beginning tag, ex=end tag, x=value)
 * 3. A human-readable contraction of the original placeholder name
 *
 * @param {NormalizedString} nsrc - Normalized source string.
 * @returns {[string, PlaceholderMap]} Tuple of [flattened string, placeholder map].
 */
export function flattenNormalizedSourceV1(nsrc) {
    const normalizedStr = [];

    /** @type {PlaceholderMap} */
    const phMap = {};
    let phIdx = 0;
    for (const part of nsrc) {
        if (typeof part === 'string') {
            normalizedStr.push(part);
        } else {
            phIdx++;
            const phPrefix = phIdx < 26 ? String.fromCharCode(96 + phIdx) : `z${phIdx}`;
            const mangledPh = `${phPrefix}_${part.t}_${(part.v?.match(/[0-9A-Za-z_]+/) || [''])[0]}`;
            normalizedStr.push(`{{${mangledPh}}}`);
            phMap[mangledPh] = {
                ...part,
                v1: mangledPh,
            };
        }
    }
    return [ normalizedStr.join(''), phMap ];
}

/**
 * Extracts normalized parts from a V1-flattened string using a placeholder map.
 * Placeholders in the result contain a "v1" property for compatibility matching.
 *
 * @param {string} str - V1-flattened string (usually a translation).
 * @param {PlaceholderMap} phMap - Placeholder map from flattenNormalizedSourceV1.
 * @returns {NormalizedString} Reconstructed normalized string.
 */
export function extractNormalizedPartsV1(str, phMap) {
    const normalizedParts = [];
    let pos = 0;
    for (const match of str.matchAll(/{{(?<ph>(?<phIdx>[a-y]|z\d+)_(?<t>x|bx|ex)_(?<phName>[0-9A-Za-z_]*))}}/g)) {
        if (match.index > pos) {
            normalizedParts.push(match.input.substring(pos, match.index));
        }
        normalizedParts.push(phMap[match.groups.ph] && {
            ...phMap[match.groups.ph],
            v1: match.groups.ph, // TODO: why do we need this? shouldn't the phMap already contain v1?
        });
        pos = match.index + match[0].length;
    }
    if (pos < str.length) {
        normalizedParts.push(str.substring(pos, str.length));
    }
    // TODO: validate actual vs. expected placeholders (name/types/number)
    return normalizedParts;
}

/**
 * Flattens a normalized source to XML-compatible string with placeholder map.
 * Analogous to flattenNormalizedSourceV1 but using xml-compatible placeholders.
 * @param {NormalizedString} nsrc - Normalized source string.
 * @returns {[string, PlaceholderMap]} Tuple of flattened string and placeholder map.
 */
export function flattenNormalizedSourceToXmlV1(nsrc) {
    const normalizedStr = [],
        phMap = /** @type {Record<string, PlaceholderPart>} */ ({});
    let phIdx = 0,
        nestingLevel = 0,
        openTagShorthand = [];
    for (const part of nsrc) {
        if (typeof part === 'string') {
            normalizedStr.push(part.replaceAll('<', '&lt;'));
        } else {
            phIdx++;
            const phPrefix = phIdx < 26 ? String.fromCharCode(96 + phIdx) : `z${phIdx}`;
            const mangledPh = `${phPrefix}_${part.t}_${(part.v.match(/[0-9A-Za-z_]+/) || [''])[0]}`;
            let phShorthand = `x${phIdx}`;
            if (part.t === 'x' || (part.t === 'ex' && nestingLevel === 0)) { // if we get a close tag before an open one, treat it like a single tag
                if (part.s) { // if we have a ph sample, we emit it as a child text node
                    normalizedStr.push(`<${phShorthand}>${part.s}</${phShorthand}>`);
                } else {
                    normalizedStr.push(`<${phShorthand} />`);
                }
            } else if (part.t === 'bx') {
                normalizedStr.push(`<${phShorthand}>`);
                openTagShorthand[nestingLevel] = phShorthand;
                nestingLevel++;
                phShorthand = `b${phShorthand}`;
            } else if (part.t === 'ex') {
                nestingLevel--;
                phShorthand = openTagShorthand[nestingLevel];
                normalizedStr.push(`</${phShorthand}>`);
                phShorthand = `e${phShorthand}`;
            }
            phMap[phShorthand] = {
                ...part,
                v1: mangledPh,
            };
        }
    }
    return [ normalizedStr.join(''), phMap ];
}

const cleanXMLEntities = str => str.replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', '\xa0')
    .replaceAll('&amp;', '&'); // make sure to replace &amp; last to avoid double unescaping

/**
 * Extracts normalized parts from an XML-format string.
 * Analogous to extractNormalizedPartsV1 but using xml-compatible placeholders.
 * @param {string} str - XML-formatted translation string.
 * @param {PlaceholderMap} phMap - Placeholder map from flattenNormalizedSourceToXmlV1.
 * @returns {NormalizedString} Normalized parts array.
 */
export function extractNormalizedPartsFromXmlV1(str, phMap) {
    const normalizedParts = [];
    let pos = 0;
    for (const match of str.matchAll(/<(?<x>x\d+) \/>|<(?<bx>x\d+)>|<\/(?<ex>x\d+)>/g)) {
        const phSample = phMap[match.groups.ex];
        // Check if this is an opening tag that has a sample placeholder
        const isOpeningTagWithSample = match.groups.bx && phMap[match.groups.bx] && phMap[match.groups.bx].s;
        
        if (match.index > pos) {
            if (phSample) {  // if we have a ph sample, skip the text node and only preserve the leading space if there
                match.input.charAt(pos) === ' ' && normalizedParts.push(' ');
            } else {
                normalizedParts.push(cleanXMLEntities(match.input.substring(pos, match.index)));
            }
        }
        
        // Skip opening tags that have samples - only process them on the closing tag
        if (isOpeningTagWithSample) {
            pos = match.index + match[0].length;
            continue;
        }
        
        const ph = phSample ??
            phMap[match.groups.x] ??
            phMap[match.groups.bx && `b${match.groups.bx}`] ??
            phMap[match.groups.ex && `e${match.groups.ex}`];
        if (ph === undefined) {
            throw new Error(`Placeholder ${match[0]} not found in phMap`);
        }
        normalizedParts.push(ph);
        // if we have a ph sample preserve the trailing space if there
        match.index > pos && phSample && match.input.charAt(match.index - 1) === ' ' && normalizedParts.push(' ');
        pos = match.index + match[0].length;
    }
    if (pos < str.length) {
        normalizedParts.push(cleanXMLEntities(str.substring(pos, str.length)));
    }
    return normalizedParts;
}

// for the purpose of compatibility, only the index and the ph type are relevat, so strip the
// last part of a v1 mangled placeholder
const minifyV1PH = v1ph => v1ph && v1ph.split('_').slice(0, -1).join('_');

/**
 * Creates a placeholder matcher function for a normalized source.
 * The matcher checks if a placeholder in a translation matches one in the source
 * using either V1-based compatibility or literal value match.
 *
 * @param {NormalizedString} nsrc - Normalized source string.
 * @returns {function(PlaceholderPart): PlaceholderPart|undefined} Matcher function.
 */
export function phMatcherMaker(nsrc) {
    const phMap = flattenNormalizedSourceV1(nsrc)[1];
    const v1PhMap = Object.fromEntries(Object.entries(phMap).map(([k, v]) => [minifyV1PH(k), v]));
    const valueMap = Object.fromEntries(Object.values(v1PhMap).map(e => [ e.v, true ]));
    return function matchPH(part) {
        return v1PhMap[minifyV1PH(part.v1)] ?? (valueMap[part.v] && part);
    }
}

/**
 * Checks if source and target normalized strings have compatible placeholders.
 * Returns true if all target placeholders match a source placeholder.
 *
 * @param {NormalizedString} nsrc - Normalized source string.
 * @param {NormalizedString} ntgt - Normalized target string.
 * @returns {boolean} True if placeholders are compatible.
 */
export function sourceAndTargetAreCompatible(nsrc, ntgt) {
    if (Array.isArray(nsrc) && Array.isArray(ntgt)) {
        const phMatcher = phMatcherMaker(nsrc);
        if (!phMatcher) {
            return false;
        }
        for (const part of ntgt) {
            if (typeof part === 'object') {
                if (phMatcher(part) === undefined) {
                    return false;
                }
            }
        }
        // the loop above may pass, yet the target may have fewer placeholder, so we check the number of ph is the same
        return Object.keys(nsrc.filter(e => typeof e === 'object')).length === Object.keys(ntgt.filter(e => typeof e === 'object')).length;
    }
    return false;
}

// converts a normalized source to another normalized source but stripping detailed ph information
// (i.e. stripping the last part of the v1 mangled placeholder format)
function flattenNormalizedSourceToMiniV1(nsrc) {
    return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.v1 ? minifyV1PH(e.v1) : e.v}}}`)).join('');
}

/**
 * Compares normalized strings assuming placeholders are equal if they are compatible.
 * @param {NormalizedString} s1 - First normalized string.
 * @param {NormalizedString} s2 - Second normalized string.
 * @returns {boolean} True if strings are equal.
 */
export function normalizedStringsAreEqual(s1, s2) {
    return flattenNormalizedSourceToMiniV1(s1) === flattenNormalizedSourceToMiniV1(s2);
}

/**
 * Creates content maps, metadata, and placeholder notes from translation units.
 * Used for preparing TUs for translation providers.
 *
 * @param {import('../../index.js').TU[]} tus - Array of translation units.
 * @returns {TUMaps} Object containing contentMap, tuMeta, and phNotes.
 */
export function getTUMaps(tus) {

    /** @type {Record<string, string>} */
    const contentMap = {};

    /** @type {Record<string, Object>} */
    const tuMeta = {};

    /** @type {Record<string, string>} */
    const phNotes = {};
    for (const tu of tus) {
        const guid = tu.guid;
        const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.nsrc);
        contentMap[guid] = normalizedStr;
        if (Object.keys(phMap).length > 0) {
            tuMeta[guid] = { phMap, nsrc: tu.nsrc };
            const sourcePhNotes = (typeof tu?.notes === 'object' ? tu.notes?.ph : undefined) ?? {};
            phNotes[guid] = Object.entries(phMap)
                .reduce((p, c, i) => `${p}\n  ${String.fromCodePoint(9312 + i)}  ${c[0]} → ${c[1].v}${c[1].s === undefined ? '' : ` → ${c[1].s}`}${sourcePhNotes[c[1].v]?.sample ? ` → ${sourcePhNotes[c[1].v]?.sample}` : ''}${sourcePhNotes[c[1].v]?.desc ? `   (${sourcePhNotes[c[1].v].desc})` : ''}`, '\n ph:')
                .replaceAll('<', 'ᐸ')
                .replaceAll('>', 'ᐳ'); // hack until they stop stripping html
        }
        if (tu.ntgt) {
            // eslint-disable-next-line no-unused-vars
            const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.ntgt);
            phNotes[guid] += `\n current translation: ${normalizedStr}`;
        }
    }
    return { contentMap, tuMeta, phNotes };
}

const notesAnnotationRegex = /(?:PH\((?<phName>(?:[^()|]+|[^(|]*\([^()|]*\)[^()|]*))(?:\|(?<phSample>[^)|]+))(?:\|(?<phDesc>[^)|]+))?\)|MAXWIDTH\((?<maxWidth>\d+)\)|SCREENSHOT\((?<screenshot>[^)]+)\)|TAG\((?<tags>[^)]+)\))/g;

/**
 * Extracts structured notes from a description string.
 * Parses annotations like PH(), MAXWIDTH(), SCREENSHOT(), TAG().
 *
 * @param {string} notes - Raw notes string with annotations.
 * @returns {StructuredNotes} Parsed structured notes object.
 */
export function extractStructuredNotes(notes) {
    const sNotes = {};
    const cleanDesc = notes.replaceAll(notesAnnotationRegex, (match, phName, phSample, phDesc, maxWidth, screenshot, tags) => {
            if (maxWidth !== undefined) {
                sNotes.maxWidth = Number(maxWidth);
            } else if (phName !== undefined) {
                phName = phName.trim();
                sNotes.ph = sNotes.ph ?? {};
                sNotes.ph[phName] = {
                    sample: phSample.trim(),
                };
                phDesc && (sNotes.ph[phName].desc = phDesc.trim());
            } else if (screenshot !== undefined) {
                sNotes.screenshot = screenshot;
            } else if (tags !== undefined) {
                sNotes.tags = tags.split(',').map(s => s.trim());
            }
            return '';
        });
    sNotes.desc = cleanDesc;
    return sNotes;
}

// this encoding tries to minimize confusion especially when rendered small in devices without copy&paste (e.g. mobile apps)
// 01OI removed because they can be mistaken and lowercase also removed as if this is indexed it may be case-insensitive
const base32Chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Converts an integer to a base32-like label for display.
 * Uses a reduced character set to avoid confusion on small screens.
 * @param {number} int - The integer to convert.
 * @returns {string} The label string.
 */
export function integerToLabel(int) {
    const label = [];
    while (int > 0) {
        label.push(base32Chars.charAt(int % 32));
        int = Math.floor(int / 32);
    }
    return label.join('');
}

/**
 * Finds the actual key in an object using case-insensitive matching.
 * @param {Record<string, unknown>} object - The object to search.
 * @param {string} key - The key to find (case-insensitive).
 * @returns {string | undefined} The actual key if found, undefined otherwise.
 */
export function fixCaseInsensitiveKey(object, key) {
    const asLowercase = key.toLowerCase();
    return Object.keys(object).find(k => k.toLowerCase() === asLowercase);
}

/**
 * Iterates over job request/response pairs, splitting by jobGuid.
 * @param {Job} [jobRequest] - The original job request with TUs.
 * @param {Job} [jobResponse] - The job response with translations.
 * @yields {{ jobProps: JobProps, tus: TU[] }} Job properties and TUs grouped by jobGuid.
 */
export function *getIteratorFromJobPair(jobRequest, jobResponse = /** @type {Job} */ ({})) {
    const requestedUnits = jobRequest?.tus ? Object.fromEntries(jobRequest.tus.map(tu => [ tu.guid, tu])) : {};
    const { inflight, tus, ...jobProps } = jobResponse;
    // because of tm exports we need to split by jobGuid and yield each group.
    /** @type {Record<string, { jobProps: JobProps, tus: TU[] }>} */
    const splitJobs = {};
    if (inflight) {
        for (const guid of inflight) {
            const reqEntry = requestedUnits[guid] ?? /** @type {Partial<TU>} */ ({});
            const { jobGuid, translationProvider, ...tuProps } = reqEntry;
            const overriddenJobProps = { ...jobProps };
            overriddenJobProps.jobGuid ??= jobGuid;
            overriddenJobProps.translationProvider ??= translationProvider;
            try {
                // TODO: should q be 0? if we set the real value it would automatically prevent duplicates in flight
                const properTU = TU.asPair({ ...tuProps, q: 0, inflight: true, ts: 0 });
                splitJobs[overriddenJobProps.jobGuid] ??= { jobProps: overriddenJobProps, tus: [] };
                splitJobs[overriddenJobProps.jobGuid].tus.push(properTU);
            } catch (e) {
                logVerbose`Problems converting in-flight entry to TU: ${e}`;
            }
        }
    }
    if (tus) {
        if (tus.length === 0) { // allow updating jobs with no units
            splitJobs[jobProps.jobGuid] ??= { jobProps, tus: [] };
        } else {
            for (const tu of tus) {
                const { jobGuid, translationProvider, ...tuProps } = tu;
                const overriddenJobProps = { ...jobProps };
                jobGuid && (overriddenJobProps.jobGuid = jobGuid);
                translationProvider && (overriddenJobProps.translationProvider = translationProvider);
                try {
                    const properTU = TU.fromRequestResponse(requestedUnits[tu.guid], tuProps);
                    splitJobs[overriddenJobProps.jobGuid] ??= { jobProps: overriddenJobProps, tus: [] };
                    splitJobs[overriddenJobProps.jobGuid].tus.push(properTU);
                } catch (e) {
                    logVerbose`Problems converting entry to TU: ${e}`;
                }
            }
        }
    }
    for (const splitJob of Object.values(splitJobs)) {
        yield splitJob;
    }
}

export function validate(context, obj = {}) {
    const validators = {
        objectProperty: (...props) => {
            props.forEach(propName => {
                if (obj[propName] !== undefined && typeof obj[propName] !== 'object') {
                    throw new Error(`Property ${propName} of ${context} must be an object`);
                }
            });
            return validators;
        },
        arrayOfFunctions: (...props) => {
            props.forEach(propName => {
                if (obj[propName] !== undefined) {
                    if (!Array.isArray(obj[propName])) {
                        throw new Error(`Property ${propName} of ${context} must be an array`);
                    }
                    obj[propName].forEach((coder, idx) => {
                        if (typeof coder !== 'function') {
                            throw new Error(`Item at index ${idx} in property ${propName} of ${context} must be a function`);
                        }
                    });
                }
            });
            return validators;
        },
    }
    return validators;
}

/**
 * Splits an array of objects into n chunks, balancing the sum of a specific
 * numerical property ('weight') in each chunk.
 *
 * This function uses a greedy algorithm. It sorts the objects by their 'weight'
 * in descending order and then iteratively adds each object to the chunk with
 * the currently smallest total weight.
 *
 * @param {object[]} items The array of objects to split.
 * @param {number} n The number of chunks to create.
 * @param {string} weightProperty The name of the property on each object that contains the numerical weight.
 * @returns {object[][]} An array containing n arrays (chunks) of the original objects.
 */
export function balancedSplitWithObjects(items, n, weightProperty) {
    // --- Input Validation ---
    if (n <= 0) {
      throw new Error("Number of chunks (n) must be a positive integer.");
    }
    if (!Array.isArray(items)) {
      throw new Error("Input 'items' must be an array of objects.");
    }
    if (typeof weightProperty !== 'string' || weightProperty.length === 0) {
      throw new Error("'weightProperty' must be a non-empty string.");
    }
    if (items.length === 0) {
      return Array.from({ length: n }, () => []);
    }
  
    // 1. Sort the input objects in descending order based on the weightProperty.
    // We create a copy with [...items] to avoid modifying the original array.
    const sortedItems = [...items].sort((a, b) => {
      const weightA = a[weightProperty] || 0;
      const weightB = b[weightProperty] || 0;
      return weightB - weightA;
    });
  
    // 2. Initialize n chunks and an array to track their sums.
    const chunks = Array.from({ length: n }, () => []);
    const sums = Array(n).fill(0);
  
    // 3. Distribute the objects into the chunks.
    for (const item of sortedItems) {
      // Access the weight from the object's property.
      const weight = item[weightProperty];
  
      // More robust validation: ensure the weight is a number.
      if (typeof weight !== 'number' || isNaN(weight)) {
        throw new Error(`Item ${JSON.stringify(item)} has a non-numeric or missing '${weightProperty}' property.`);
      }
  
      // Find the index of the chunk with the smallest current sum.
      const minSumIndex = sums.indexOf(Math.min(...sums));
  
      // Add the entire object to that chunk.
      chunks[minSumIndex].push(item);
  
      // Update the sum for that chunk using the object's weight.
      sums[minSumIndex] += weight;
    }
  
    return chunks;
  }
