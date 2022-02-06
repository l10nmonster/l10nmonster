// Generic pluggable decoder
export function regexDecoderMaker(regex, partDecoder) {
    return function decoder(parts) {
        const decodedParts = parts.map(p => {
            if (typeof p === 'string') {
                const expandedPart = [];
                for (const part of p.matchAll(regex)) {
                    expandedPart.push(partDecoder(part));
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
export const xmlEntityDecoder = regexDecoderMaker(
    /(?<node>(?<text>[^&]+)|(?<namedEntity>&[^#;]+;)|&#(?<numericEntity>\d+);)/g,
    (part) => (part.groups.text ??
                (part.groups.namedEntity ?
                    (namedEntities[part.groups.namedEntity] || part.groups.namedEntity) :
                    String.fromCharCode(parseInt(part.groups.numericEntity, 10))
                ))
);

const javaControlChars = {
    t: '\t',
    b: '\b',
    n: '\n',
    r: '\r',
    f: '\f',
};
export const javaEscapesDecoder = regexDecoderMaker(
    /(?<node>(?<text>[^\\]+)|\\(?<escapedChar>['"\\])|\\(?<escapedControl>[tbnrf])|\\u(?<codePoint>[0-9A-Za-z]{4}))/g,
    (part) => (part.groups.text ?? part.groups.escapedChar ??
        (part.groups.escapedControl ?
            (javaControlChars[part.groups.escapedControl] ?? `\\${part.groups.escapedControl}`) :
            String.fromCharCode(parseInt(part.groups.codePoint, 16))
        )
    )
);

//// Placeholders

// Works for both XML and HTML
export const xmlDecoder = regexDecoderMaker(
    /(?<node>(?<text>[^<]+)|(?<tag><[^>]+>))/g,
    (part) => (part.groups.text ?? { t: 'ph', v: part.groups.tag })
);

// {param} style placeholders
export const bracePHDecoder = regexDecoderMaker(
    /(?<node>(?<text>[^{]+)|(?<tag>{[^}]+}))/g,
    (part) => (part.groups.text ?? { t: 'ph', v: part.groups.tag })
);

// iOS-style and C-style placeholders
// Supports %02d, %@, %1$@
export const iosPHDecoder = regexDecoderMaker(
    // /(?<node>(?<tag>%([0-9.]+\$)?[@dfs])|(?<text>.+?))/g,
    /(?<node>(?<tag>%([0-9\.]*[@dfs]|\d+\$[@dfs]))|(?<text>.+?))/g,
    (part) => (part.groups.text ?? { t: 'ph', v: part.groups.tag })
);
