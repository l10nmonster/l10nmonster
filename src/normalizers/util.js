export function consolidateDecodedParts(parts, flags, convertToString) {
    const consolidatedParts = [];
    let accumulatedString = '';
    for (const part of parts) {
        if (part.t === 's') {
            accumulatedString += part.v;
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

export function getNormalizedString(str, decoderList, flags = {}) {
    let parts = [ { t: 's', v: str } ];
    for (const decoder of decoderList) {
        parts = consolidateDecodedParts(decoder(parts), flags);
    }
    return consolidateDecodedParts(parts, flags, true);
}

export function flattenNormalizedSourceToOrdinal(nsrc) {
    return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

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
            const mangledPh = `${phPrefix}_${part.t}_${(part.v.match(/[0-9A-Za-z_]+/) || [''])[0]}`;
            normalizedStr.push(`{{${mangledPh}}}`);
            phMap[mangledPh] = {
                ...part,
                v1: mangledPh,
            };
        }
    }
    return [ normalizedStr.join(''), phMap ];
}

export function extractNormalizedPartsV1(str, phMap) {
    const normalizedParts = [];
    let pos = 0;
    for (const match of str.matchAll(/{{(?<ph>(?<phIdx>[a-y]|z\d+)_(?<t>x|bx|ex)_(?<phName>[0-9A-Za-z_]*))}}/g)) {
        if (match.index > pos) {
            normalizedParts.push(match.input.substring(pos, match.index));
        }
        normalizedParts.push({
            ...phMap[match.groups.ph],
            v1: match.groups.ph,
        });
        pos = match.index + match[0].length;
    }
    if (pos < str.length) {
        normalizedParts.push(str.substring(pos, str.length));
    }
    // TODO: validate actual vs. expected placeholders (name/types/number)
    return normalizedParts;
}

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
                normalizedStr.push(`<${phShorthand} />`);
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

const cleanXMLEntities = str => str.replaceAll('&lt;', '<').replaceAll('&amp;', '&').replaceAll('&nbsp;', '\xa0')
export function extractNormalizedPartsFromXmlV1(str, phMap) {
    const normalizedParts = [];
    let pos = 0;
    for (const match of str.matchAll(/<(?<x>x\d+) \/>|<(?<bx>x\d+)>|<\/(?<ex>x\d+)>/g)) {
        if (match.index > pos) {
            normalizedParts.push(cleanXMLEntities(match.input.substring(pos, match.index)));
        }
        normalizedParts.push(phMap[match.groups.x ??
            (match.groups.bx && `b${match.groups.bx}`) ??
            (match.groups.ex && `e${match.groups.ex}`)]);
        pos = match.index + match[0].length;
    }
    if (pos < str.length) {
        normalizedParts.push(cleanXMLEntities(str.substring(pos, str.length)));
    }
    return normalizedParts;
}

const minifyV1PH = v1ph => v1ph && v1ph.split('_').slice(0, -1).join('_');

export function phMatcherMaker(nsrc) {
    const phMap = flattenNormalizedSourceV1(nsrc)[1];
    const v1PhMap = Object.fromEntries(Object.entries(phMap).map(([k, v]) => [minifyV1PH(k), v]));
    const valueMap = Object.fromEntries(Object.values(v1PhMap).map(e => [ e.v, true ]));
    return function matchPH(part) {
        return v1PhMap[minifyV1PH(part.v1)] ?? (valueMap[part.v] && part);
    }
}

export function sourceAndTargetAreCompatible(nsrc, ntgt) {
    if (Boolean(nsrc) && Boolean(ntgt)) {
        !Array.isArray(nsrc) && (nsrc = [ nsrc ]);
        !Array.isArray(ntgt) && (ntgt = [ ntgt ]);
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

export function normalizedStringsAreEqual(s1, s2) {
    const f1 = Array.isArray(s1) ? flattenNormalizedSourceToOrdinal(s1) : s1;
    const f2 = Array.isArray(s2) ? flattenNormalizedSourceToOrdinal(s2) : s2;
    return f1 === f2;
}

export function getTUMaps(tus) {
    const contentMap = {};
    const tuMeta = {};
    const phNotes = {};
    for (const tu of tus) {
        const guid = tu.guid;
        if (tu.nsrc) {
            const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.nsrc);
            contentMap[guid] = normalizedStr;
            if (Object.keys(phMap).length > 0) {
                tuMeta[guid] = { contentType: tu.contentType, phMap, nsrc: tu.nsrc };
                phNotes[guid] = Object.entries(phMap)
                    .reduce((p, c) => `${p} ${c[0]}=${c[1].v}`, '\n ph:')
                    .replaceAll('<', 'ᐸ')
                    .replaceAll('>', 'ᐳ'); // hack until they stop stripping html
            }
            if (tu.ntgt) {
                // eslint-disable-next-line no-unused-vars
                const [normalizedStr, phMap ] = flattenNormalizedSourceV1(tu.ntgt);
                phNotes[guid] += `\n current translation: ${normalizedStr}`;
            }
        } else {
            contentMap[guid] = tu.src;
            tuMeta[guid] = { src: tu.src };
            if (tu.tgt) {
                phNotes[guid] = `\n current translation: ${tu.tgt}`;
            }
        }
    }
    return { contentMap, tuMeta, phNotes };
}
