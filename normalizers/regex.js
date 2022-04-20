// Note: in general, decoders are more complicated than encoders because there are usually multiple ways
//   to specify the same thing in input, but we choose a single way to produce in output (e.g. CDATA vs. escapes)
//   Don't be surprised if you see we don't express the full semantics of the source, because our goals here
//   is to protect placeholders from getting corrupted, so we may have to merge different rule sets together
//   (e.g. MessageFormat variables and HTML markup). There are also edge cases like a Java service returning
//   an Android message format string, where we may need to overlay both Java and Android rules together.

// Generic pluggable decoder
export function regexMatchingDecoderMaker(flag, regex, partDecoder) {
    const fn = function decoder(parts) {
        const decodedParts = parts.map(p => {
            if (p.t === 's') {
                const expandedPart = [];
                let pos = 0;
                for (const match of p.v.matchAll(regex)) {
                    if (match.index > pos) {
                        expandedPart.push({
                            t: 's',
                            v: match.input.substring(pos, match.index),
                        });
                    }
                    const decodedMatch = partDecoder(match.groups);
                    if (typeof decodedMatch === 'string') {
                        expandedPart.push({
                            t: 's',
                            v: decodedMatch,
                            flag,
                        });
                    } else {
                        expandedPart.push(decodedMatch);
                    }
                    pos = match.index + match[0].length;
                }
                if (pos < p.v.length) {
                    expandedPart.push({
                        t: 's',
                        v: p.v.substring(pos, p.v.length),
                    });
                }
                return expandedPart;
            } else {
                return p;
            }
        });
        return decodedParts.flat(1);
    };
    Object.defineProperty(fn, 'name', { value: flag });
    return fn;
}

// Generic wrapper to rename a decoder
export function namedDecoder(name, decoder) {
    const fn = function namedDecoder(parts) {
        return decoder(parts).map(p => (p.flag === decoder.name ? { ...p, flag: name } : p));
    }
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
}

// Generic pluggable encoder
export function regexMatchingEncoderMaker(name, regex, charMap) {
    const fn = function encoder(str) {
        return str.replaceAll(regex, (match, ...capture) => {
            const charToReplace = capture.reduce((p,c) => p ?? c);
            return match.replace(charToReplace, charMap[charToReplace]);
        });
    };
    Object.defineProperty(fn, 'name', { value: name });
    return fn;
}

// Generic flag-based encoder execution
export function gatedEncoder(encoder, ...flagNames) {
    const fn = function gatedEncoder(str, flags = {}) {
        const run = flagNames.reduce((run, flag) => run || (flag.charAt(0) === '!' ? !flags[flag.substring(1)] : flags[flag]), false);
        return run ? encoder(str, flags) : str;
    };
    Object.defineProperty(fn, 'name', { value: `gatedEncoder_${flagNames.join('_')}` });
    return fn;
}

const namedEntities = {
    '&nbsp;': '\u00a0',
    '&amp;' : '&',
    '&quot;': '"',
    '&lt;'  : '<',
    '&gt;'  : '>'
};
export const xmlEntityDecoder = regexMatchingDecoderMaker(
    'xmlEntityDecoder',
    /(?<node>&#x(?<hexEntity>[0-9a-fA-F]+);|(?<namedEntity>&[^#;]+;)|&#(?<numericEntity>\d+);)/g,
    // eslint-disable-next-line no-nested-ternary
    (groups) => (groups.namedEntity ?
                    (namedEntities[groups.namedEntity] || groups.namedEntity) :
                    (groups.hexEntity ?
                        String.fromCharCode(parseInt(groups.hexEntity, 16)) :
                        String.fromCharCode(parseInt(groups.numericEntity, 10)))
                )
);

// TODO: this is conflating generic XML CDATA with Android-specific quotes, so it's really an android-only thing
export const xmlCDataDecoder = regexMatchingDecoderMaker(
    'xmlCDataDecoder',
    /(?:<!\[CDATA\[(?<cdata>.*?)\]\]>|(?:(?<firstChar>[^\\])"|^")(?<quoted>.*?)(?<lastChar>[^\\])")/gs,
    groups => groups.cdata ?? ((groups.firstChar || '') + groups.quoted + (groups.lastChar ?? ''))
);

export const xmlEntityEncoder = regexMatchingEncoderMaker(
    'xmlEntityEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(&)|(<)|(\u00a0)/g,
    {
        '&': '&amp;',
        '<': '&lt;',
        '\u00a0': '&#160;',
    }
);

// https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/LoadingResources/Strings/Strings.html#//apple_ref/doc/uid/10000051i-CH6-97055-CJBFDJGF
const iosControlCharsToDecode = {
    t: '\t',
    n: '\n',
    r: '\r',
    f: '\f',
};
export const iosEscapesDecoder = regexMatchingDecoderMaker(
    'iosEscapesDecoder',
    /(?<node>\\(?<escapedChar>['"\\])|\\(?<escapedControl>[tbnrf])|\\U(?<codePoint>[0-9A-Za-z]{4}))/g, // note that in ios the \U is uppercase!
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (iosControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

export const iosEscapesEncoder = regexMatchingEncoderMaker(
    'iosEscapesEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(\t)|(\n)|(\r)|(\f)/g,
    {
        '\t': '\\t',
        '\n': '\\n',
        '\r': '\\r',
        '\f': '\\f',
    }
);

const javaControlCharsToDecode = {
    t: '\t',
    b: '\b',
    n: '\n',
    r: '\r',
    f: '\f',
};
export const javaEscapesDecoder = regexMatchingDecoderMaker(
    'javaEscapesDecoder',
    /(?<node>\\(?<escapedChar>['"\\])|\\(?<escapedControl>[tbnrf])|\\u(?<codePoint>[0-9A-Za-z]{4}))/g,
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (javaControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

// TODO: do we need to escape also those escapedChar that we decoded?
export const javaEscapesEncoder = regexMatchingEncoderMaker(
    'javaEscapesEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(\t)|(\n)|(\r)|(\f)|(\u00a0)/g,
    {
        '\t': '\\t',
        '\n': '\\n',
        '\r': '\\r',
        '\f': '\\f',
        '\u00a0': '\\u00a0',
    }
);

export const javaMFQuotesDecoder = regexMatchingDecoderMaker(
    'javaMFQuotesDecoder',
    /(?:(?<quote>')'|(?:'(?<quoted>[^']+)'))/g,
    groups => groups.quote ?? groups.quoted
);

// need to be smart about detecting whether MessageFormat was used or not based on presence of {vars}
export const javaMFQuotesEncoder = regexMatchingEncoderMaker(
    'javaMFQuotesEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(')/g,
    {
        "'": "''",
    }
);

const androidControlCharsToDecode = {
    n: '\n',
    t: '\t',
};
export const androidEscapesDecoder = regexMatchingDecoderMaker(
    'androidEscapesDecoder',
    /(?<node>\\(?<escapedChar>[@?\\'"])|\\(?<escapedControl>[nt])|\\u(?<codePoint>[0-9A-Za-z]{4}))/g,
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (androidControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

export const androidEscapesEncoder = (str, flags = {}) => {
    let escapedStr = str.replaceAll(/[@\\'"]/g, '\\$&').replaceAll('\t', '\\t').replaceAll('\n', '\\n');
    // eslint-disable-next-line prefer-template
    flags.isFirst && escapedStr[0] === ' ' && (escapedStr = '\\u0020' + escapedStr.substring(1));
    // eslint-disable-next-line prefer-template
    flags.isLast && escapedStr.length > 0 && escapedStr[escapedStr.length - 1] === ' ' && (escapedStr = escapedStr.substring(0, escapedStr.length - 1) + '\\u0020');
    return escapedStr;
};

export const androidSpaceCollapser = (parts) => parts.map(p => (p.t === 's' ? { ...p, v: p.v.replaceAll(/[ \f\n\r\t\v\u2028\u2029]+/g, ' ')} : p));

export const doublePercentDecoder = regexMatchingDecoderMaker(
    'doublePercentDecoder',
    /(?<percent>%%)/g,
    (groups) => groups.percent.replace('%%', '%'));

export const doublePercentEncoder = (str) => str.replaceAll('%', '%%');

// Placeholders

// Works for both XML and HTML
export const xmlDecoder = regexMatchingDecoderMaker(
    'xmlDecoder',
    /(?<tag>(?<x><[^>]+\/>)|(?<bx><[^/!][^>]*>)|(?<ex><\/[^>]+>))/g,
    // eslint-disable-next-line no-nested-ternary
    (groups) => ({ t: (groups.bx ? 'bx' : (groups.ex ? 'ex' : 'x')), v: groups.tag })
);

// {param} style placeholders
export const bracePHDecoder = regexMatchingDecoderMaker(
    'bracePHDecoder',
    /(?<x>{[^}]+})/g,
    (groups) => ({ t: 'x', v: groups.x })
);

// iOS-style and C-style placeholders
// Supports %02d, %@, %1$@
// TODO: follow full specs at https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Strings/Articles/formatSpecifiers.html
export const iosPHDecoder = regexMatchingDecoderMaker(
    'iosPHDecoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(?<tag>%([0-9.]*[lz]?[@dfsi]|\d+\$[@dfsi]))/g,
    (groups) => ({ t: 'x', v: groups.tag })
);
