const { regex } = require('@l10nmonster/helpers');

exports.PropertiesFilter = require('./filter');

const javaControlCharsToDecode = {
    t: '\t',
    b: '\b',
    n: '\n',
    r: '\r',
    f: '\f',
};
exports.escapesDecoder = regex.decoderMaker(
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
exports.escapesEncoder = regex.encoderMaker(
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

exports.MFQuotesDecoder = regex.decoderMaker(
    'javaMFQuotesDecoder',
    /(?:(?<quote>')'|(?:'(?<quoted>[^']+)'))/g,
    groups => groups.quote ?? groups.quoted
);

// need to be smart about detecting whether MessageFormat was used or not based on presence of {vars}
exports.MFQuotesEncoder = regex.encoderMaker(
    'javaMFQuotesEncoder',
    // eslint-disable-next-line prefer-named-capture-group
    /(')/g,
    {
        "'": "''",
    }
);
