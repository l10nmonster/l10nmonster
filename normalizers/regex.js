// Generic pluggable decoder
export function regexMatchingDecoderMaker(regex, partDecoder) {
    return function decoder(parts) {
        const decodedParts = parts.map(p => {
            if (typeof p === 'string') {
                const expandedPart = [];
                let pos = 0;
                for (const match of p.matchAll(regex)) {
                    if (match.index > pos) {
                        expandedPart.push(match.input.substring(pos, match.index));
                    }
                    expandedPart.push(partDecoder(match.groups));
                    pos = match.index + match[0].length;
                }
                if (pos < p.length) {
                    expandedPart.push(p.substring(pos, p.length));
                }
                return expandedPart;
            } else {
                return p;
            }
        });
        return decodedParts.flat(1);
    }
}

// Escaping

const namedEntities = {
    '&nbsp;': '\u00a0',
    '&amp;' : '&',
    '&quot;': '"',
    '&lt;'  : '<',
    '&gt;'  : '>'
};
export const xmlEntityDecoder = regexMatchingDecoderMaker(
    /(?<node>(?<namedEntity>&[^#;]+;)|&#(?<numericEntity>\d+);)/g,
    (groups) => (groups.namedEntity ?
                    (namedEntities[groups.namedEntity] || groups.namedEntity) :
                    String.fromCharCode(parseInt(groups.numericEntity, 10))
                )
);

export const xmlEntityEncoder = (str) => str.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

const javaControlCharsToDecode = {
    t: '\t',
    b: '\b',
    n: '\n',
    r: '\r',
    f: '\f',
};
export const javaEscapesDecoder = regexMatchingDecoderMaker(
    /(?<node>\\(?<escapedChar>['"\\])|\\(?<escapedControl>[tbnrf])|\\u(?<codePoint>[0-9A-Za-z]{4}))/g,
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (javaControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

// TODO: do we need to escape also those escapedChar that we decoded?
export const javaEscapesEncoder = (str) => str.replaceAll('\t', '\\t').replaceAll('\b', '\\b')
    .replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\f', '\\f');

const androidControlCharsToDecode = {
    n: '\n',
    t: '\t',
};
export const androidEscapesDecoder = regexMatchingDecoderMaker(
    /(?<node>\\(?<escapedChar>[@?\\'"])|\\(?<escapedControl>[nt])|\\u(?<codePoint>[0-9A-Za-z]{4}))/g,
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (androidControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

export const androidEscapesEncoder = (str) => str.replaceAll(/[@\\'"]/g, '\\$&')
    .replaceAll('\t', '\\t').replaceAll('\n', '\\n');

// Placeholders

// Works for both XML and HTML
export const xmlDecoder = regexMatchingDecoderMaker(
    /(?<tag>(?<x><[^>]+\/>)|(?<bx><[^/][^>]*>)|(?<ex><\/[^>]+>))/g,
    // eslint-disable-next-line no-nested-ternary
    (groups) => ({ t: (groups.bx ? 'bx' : (groups.ex ? 'ex' : 'x')), v: groups.tag })
);

// {param} style placeholders
export const bracePHDecoder = regexMatchingDecoderMaker(
    /(?<x>{[^}]+})/g,
    (groups) => ({ t: 'x', v: groups.x })
);

// iOS-style and C-style placeholders
// Supports %02d, %@, %1$@
export const iosPHDecoder = regexMatchingDecoderMaker(
    // eslint-disable-next-line prefer-named-capture-group
    /(?<tag>%([0-9.]*[lz]?[@dfsi]|\d+\$[@dfsi]))/g,
    (groups) => ({ t: 'x', v: groups.tag })
);
