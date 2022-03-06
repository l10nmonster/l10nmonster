export function consolidateDecodedParts(parts, flags) {
    const consolidatedParts = [];
    let accumulatedString = '';
    for (const part of parts) {
        if (part.t === 's') {
            accumulatedString += part.v;
            part.f && (flags[part.flag] = true);
        } else {
            if (accumulatedString.length > 0) {
                consolidatedParts.push(accumulatedString);
                accumulatedString = '';
            }
            consolidatedParts.push(part);
        }
    }
    if (accumulatedString.length > 0) {
        consolidatedParts.push(accumulatedString);
    }
    return consolidatedParts;
}

export function getNormalizedString(str, decoderList, flags = {}) {
    let parts = [ { t: 's', v: str } ];
    for (const decoder of decoderList) {
        parts = decoder(parts);
    }
    return consolidateDecodedParts(parts, flags);
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

export function sourceAndTargetAreCompatible(nsrc, ntgt) {
    Array.isArray(nsrc) && nsrc.length === 1 && (nsrc = nsrc[0]);
    Array.isArray(ntgt) && ntgt.length === 1 && (ntgt = ntgt[0]);
    if (typeof nsrc === 'string' && typeof ntgt === 'string') {
        return true;
    } else if (Array.isArray(nsrc) && Array.isArray(ntgt)) {
        const v1PhMap = flattenNormalizedSourceV1(nsrc)[1];
        const valueMap = Object.fromEntries(Object.values(v1PhMap).map(e => [ e.v, true ]));
        for (const ph of ntgt) {
            if (typeof ph === 'object') {
                if (!v1PhMap[ph.v1] && !valueMap[ph.v]) {
                    return false;
                }
            }
        }
        return true;
    }
    return false;
}
