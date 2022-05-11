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
            phMap[mangledPh] = part;
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
    let phIdx = 0;
    for (const part of nsrc) {
        if (typeof part === 'string') {
            normalizedStr.push(part.replaceAll('<', '&lt;'));
        } else {
            phIdx++;
            const phPrefix = phIdx < 26 ? String.fromCharCode(96 + phIdx) : `z${phIdx}`;
            const mangledPh = `${phPrefix}_${part.t}_${(part.v.match(/[0-9A-Za-z_]+/) || [''])[0]}`;
            normalizedStr.push(`<${part.t === 'ex' ? '/' : ''}${mangledPh}${part.t === 'x' ? ' /' : ''}>`);
            phMap[mangledPh] = part;
        }
    }
    return [ normalizedStr.join(''), phMap ];
}

export function extractNormalizedPartsFromXmlV1(str, phMap) {
    const normalizedParts = [];
    let pos = 0;
    for (const match of str.matchAll(/<(?:\/)?(?<ph>(?<phIdx>[a-y]|z\d+)_(?<t>x|bx|ex)_(?<phName>[0-9A-Za-z_]*))(?: \/)?>/g)) {
        if (match.index > pos) {
            normalizedParts.push(match.input.substring(pos, match.index).replaceAll('&lt;', '<'));
        }
        normalizedParts.push({
            ...phMap[match.groups.ph],
            v1: match.groups.ph,
        });
        pos = match.index + match[0].length;
    }
    if (pos < str.length) {
        normalizedParts.push(str.substring(pos, str.length).replaceAll('&lt;', '<'));
    }
    // TODO: validate actual vs. expected placeholders (name/types/number)
    return normalizedParts;
}

export function sourceAndTargetAreCompatible(nsrc, ntgt) {
    if (Boolean(nsrc) && Boolean(ntgt)) {
        !Array.isArray(nsrc) && (nsrc = [ nsrc ]);
        !Array.isArray(ntgt) && (ntgt = [ ntgt ]);
        const v1PhMap = flattenNormalizedSourceV1(nsrc)[1];
        const valueMap = Object.fromEntries(Object.values(v1PhMap).map(e => [ e.v, true ]));
        for (const ph of ntgt) {
            if (typeof ph === 'object') {
                if (!v1PhMap[ph.v1] && !valueMap[ph.v]) {
                    return false;
                }
            }
        }
        return Object.keys(v1PhMap).length === Object.keys(flattenNormalizedSourceV1(ntgt)[1]).length;
    }
    return false;
}
