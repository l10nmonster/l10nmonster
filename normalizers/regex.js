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

//// Escaping

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

const javaControlChars = {
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
            (javaControlChars[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

//// Placeholders

// Works for both XML and HTML
export const xmlDecoder = regexMatchingDecoderMaker(
    /(?<tag>(?<bx><[^>/]+>)|(?<ex><\/[^>]+>)|(?<x><[^>]+\/>))/g,
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
    // /(?<node>(?<tag>%([0-9.]+\$)?[@dfs])|(?<text>.+?))/g,
    /(?<tag>%([0-9\.]*[@dfsi]|\d+\$[@dfsi]))/g,
    (groups) => ({ t: 'x', v: groups.tag })
);
