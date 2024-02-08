const i18nStringsFiles = require('@l10nmonster/i18n-strings-files');
const { regex } = require('@l10nmonster/helpers');

// filter for iOS .strings file (in utf-8)
exports.StringsFilter = class IosStringsFilter {
    constructor(params) {
        this.emitComments = params?.emitComments || false;
    }

    async parseResource({ resource }) {
        const parsedResource = i18nStringsFiles.parse(resource, { 'wantsComments' : true });
        const segments = Object.entries(parsedResource).map(([k, v]) => ({
            sid: k,
            str: v.text,
            notes: v.comment,
        }));
        return {
            segments,
        };
    }

    async translateResource({ resource, translator }) {
        const parsedResource = i18nStringsFiles.parse(resource, { 'wantsComments' : true });
        for (const [sid, source] of Object.entries(parsedResource)) {
            const translation = await translator(sid, source.text);
            if (translation === undefined) {
                delete parsedResource[sid];
            } else {
                parsedResource[sid].text = translation;
                !this.emitComments && parsedResource[sid].comment && delete parsedResource[sid].comment;
            }
        }
        return Object.keys(parsedResource).length > 0 ?
            i18nStringsFiles.compile(parsedResource, { 'wantsComments' : this.emitComments }) :
            null;
    }
}

// https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/LoadingResources/Strings/Strings.html#//apple_ref/doc/uid/10000051i-CH6-97055-CJBFDJGF
const iosControlCharsToDecode = {
    t: '\t',
    n: '\n',
    r: '\r',
    f: '\f',
};
exports.escapesDecoder = regex.decoderMaker(
    'iosEscapesDecoder',
    /(?<node>\\(?<escapedChar>['"\\])|\\(?<escapedControl>[tbnrf])|\\U(?<codePoint>[0-9A-Za-z]{4}))/g, // note that in ios the \U is uppercase!
    (groups) => (groups.escapedChar ??
        (groups.escapedControl ?
            (iosControlCharsToDecode[groups.escapedControl] ?? `\\${groups.escapedControl}`) :
            String.fromCharCode(parseInt(groups.codePoint, 16))
        )
    )
);

exports.escapesEncoder = regex.encoderMaker(
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

// iOS-style and C-style placeholders
// full specs at https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Strings/Articles/formatSpecifiers.html
// and https://pubs.opengroup.org/onlinepubs/009695399/functions/printf.html
// loosely based on https://stackoverflow.com/questions/45215648/regex-capture-type-specifiers-in-format-string
// space and quote tags have been omitted to avoid matching unexpected combinations
exports.phDecoder = regex.decoderMaker(
    'iosPHDecoder',
    /(?<tag>%(?:\d\$)?[0#+-]?[0-9*]*\.?\d*[hl]{0,2}[jztL]?[diuoxXeEfgGaAcpsSn@])/g,
    (groups) => ({ t: 'x', v: groups.tag })
);
