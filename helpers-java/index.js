import { regex } from '@l10nmonster/core';

export { default as PropertiesFilter } from './filter.js';

const javaControlCharsToDecode = {
    t: '\t',
    b: '\b',
    n: '\n',
    r: '\r',
    f: '\f',
};
export const escapesDecoder = regex.decoderMaker(
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
export const escapesEncoder = regex.encoderMaker(
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

export const MFQuotesDecoder = regex.decoderMaker(
    'javaMFQuotesDecoder',
    /(?:(?<quote>')'|(?:'(?<quoted>[^']+)'))/g,
    groups => groups.quote ?? groups.quoted
);

// need to be smart about detecting whether MessageFormat was used or not based on presence of {vars}
export const MFQuotesEncoder = regex.encoderMaker(
    'javaMFQuotesEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(')/g,
    {
        "'": "''",
    }
);
