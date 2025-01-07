import { createHash } from 'crypto';

export function generateGuid(str) {
    const sidContentHash = createHash('sha256');
    sidContentHash.update(str, 'utf8');
    return sidContentHash.digest().toString('base64').substring(0, 43).replaceAll('+', '-').replaceAll('/', '_');
}

export function consolidateDecodedParts(parts, flags, convertToString) {
    const consolidatedParts = [];
    let accumulatedString = '';
    for (const part of parts) {
        if (part.t === 's' || typeof part === 'string') {
            accumulatedString += typeof part === 'string' ? part : part.v;
            part.flag && (flags[part.flag] = true);
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

export function decodeNormalizedString(nstr, decoderList, flags = {}) {
    if (decoderList) {
        for (const decoder of decoderList) {
            nstr = consolidateDecodedParts(decoder(nstr), flags);
        }
    }
    return consolidateDecodedParts(nstr, flags, true);
}

export function getNormalizedString(str, decoderList, flags = {}) {
    return decoderList ? decodeNormalizedString([ { t: 's', v: str } ], decoderList, flags) : [ str ];
}

export function flattenNormalizedSourceToOrdinal(nsrc) {
    return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

// takes a normalized source and converts it to a flat string using the "v1" algorithm
// v1 encodes placeholders in a `{{${mangledPh}}}` format where mangledPh has 3
// components separated by "_":
//   1. an index "a" to "zX" (where X is an integer)
//   2. the placeholder type (bx=beginning tag, ex=end tag, x=value)
//   3. a human-readable contraction of the original raw placeholder name
// it returns the flattened string and corresponding map to convert back to normalized array
export function flattenNormalizedSourceV1(nsrc) {
    const normalizedStr = [],
        phMap = {};
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

// takes a flat string using the "v1" algorithm (usually a translation) and a ph map
// and converts it to a normalized string
// placeholders in the resulting normalized string contain an extra "v1" property that
// allows to better validate and determine compatibility with textual matches (repetitions)
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

// analogous to flattenNormalizedSourceV1 but using xml-compatible placeholders
export function flattenNormalizedSourceToXmlV1(nsrc) {
    const normalizedStr = [],
        phMap = {};
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

// analogous to extractNormalizedPartsV1 but using xml-compatible placeholders
export function extractNormalizedPartsFromXmlV1(str, phMap) {
    const normalizedParts = [];
    let pos = 0;
    for (const match of str.matchAll(/<(?<x>x\d+) \/>|<(?<bx>x\d+)>|<\/(?<ex>x\d+)>/g)) {
        const phSample = phMap[match.groups.ex];
        if (match.index > pos) {
            if (phSample) {  // if we have a ph sample, skip the text node and only preserve the leading space if there
                match.input.charAt(pos) === ' ' && normalizedParts.push(' ');
            } else {
                normalizedParts.push(cleanXMLEntities(match.input.substring(pos, match.index)));
            }
        }
        !phMap[match.groups.bx] && // if we have a ph sample, skip the open tag
            normalizedParts.push(phSample ??
                phMap[match.groups.x] ??
                phMap[match.groups.bx && `b${match.groups.bx}`] ??
                phMap[match.groups.ex && `e${match.groups.ex}`]);
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

// returns a functions that given a placeholder in a translation it tells if matches a placeholder
// in the given source using either v1-based compatibility or straight literal match
export function phMatcherMaker(nsrc) {
    const phMap = flattenNormalizedSourceV1(nsrc)[1];
    const v1PhMap = Object.fromEntries(Object.entries(phMap).map(([k, v]) => [minifyV1PH(k), v]));
    const valueMap = Object.fromEntries(Object.values(v1PhMap).map(e => [ e.v, true ]));
    return function matchPH(part) {
        return v1PhMap[minifyV1PH(part.v1)] ?? (valueMap[part.v] && part);
    }
}

// compares compatibility of placeholders in source and target and returns a boolean
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

// compares normalized strings assuming placeholders are equal if they are compatible
export function normalizedStringsAreEqual(s1, s2) {
    return flattenNormalizedSourceToMiniV1(s1) === flattenNormalizedSourceToMiniV1(s2);
}

export function getTUMaps(tus) {
    const contentMap = {};
    const tuMeta = {};
    const phNotes = {};
    for (const tu of tus) {
        const guid = tu.guid;
        const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.nsrc);
        contentMap[guid] = normalizedStr;
        if (Object.keys(phMap).length > 0) {
            tuMeta[guid] = { phMap, nsrc: tu.nsrc };
            const sourcePhNotes = tu?.notes?.ph ?? {};
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
export function integerToLabel(int) {
    const label = [];
    while (int > 0) {
        label.push(base32Chars.charAt(int % 32));
        int = Math.floor(int / 32);
    }
    return label.join('');
}

// https://stackoverflow.com/questions/12484386/access-javascript-property-case-insensitively
export function fixCaseInsensitiveKey(object, key) {
    const asLowercase = key.toLowerCase();
    return Object.keys(object).find(k => k.toLowerCase() === asLowercase);
}
